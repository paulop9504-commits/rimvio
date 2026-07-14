import {
  runContextConditionAnchorPin,
  type ContextConditionAnchorPinOutcome,
} from "@/lib/globe/context-condition-ai";
import { writeContextConditionLastBatch } from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";
import {
  buildTripExperienceParallelScouts,
  type TripExperienceScoutLeg,
} from "@/lib/globe/trip-experience/build-trip-experience-parallel-scouts";
import { mergeTripExperienceScoutOutcomes } from "@/lib/globe/trip-experience/merge-trip-experience-scout-outcomes";
import type { OneShotTripExperiencePrepPlan } from "@/lib/globe/trip-experience/plan-one-shot-trip-experience-prep";
import type { DiscoverySearchOrigin } from "@/lib/globe/discovery-lens/types";
import { emitSearchHubAction } from "@/lib/globe/resource/hub-action-record-store";

export type RunTripExperienceParallelScoutInput = {
  contextEventId: string;
  triggerMessage: string;
  plan: OneShotTripExperiencePrepPlan;
  anchorPlaceId: string;
  anchorPlaceName: string;
  anchorLat: number;
  anchorLng: number;
  anchorPriceKrw?: number | null;
  discoveryOrigin?: DiscoverySearchOrigin | null;
  operatorRuntimeId?: string | null;
};

export type RunTripExperienceParallelScoutResult = {
  readonly merged: ContextConditionAnchorPinOutcome | null;
  readonly legs: Partial<Record<TripExperienceScoutLeg, ContextConditionAnchorPinOutcome | null>>;
  readonly scoutCount: number;
  readonly searchActionId: string | null;
};

/** Run lodging · eatery · activity scouts in parallel for trip experience. */
export async function runTripExperienceParallelScouts(
  input: RunTripExperienceParallelScoutInput,
): Promise<RunTripExperienceParallelScoutResult> {
  const scouts = buildTripExperienceParallelScouts(input.plan);
  const dest =
    input.plan.experienceState.destinationLabel?.trim() ||
    input.anchorPlaceName.trim() ||
    "여행지";

  const searchEmit = emitSearchHubAction({
    contextEventId: input.contextEventId,
    sourceHubId: "hub.trip_experience_parallel",
    operatorRuntimeId: input.operatorRuntimeId?.trim() || undefined,
    approvalPolicy: "user_tap",
    payload: {
      query: input.triggerMessage.trim() || dest,
      filters: {
        funAxis: input.plan.experienceState.funAxis,
        destinationScope: input.plan.experienceState.destinationScope,
        scoutLegs: [...input.plan.scoutLegs],
      },
    },
  });
  const searchActionId = searchEmit.ok ? searchEmit.action.actionId : null;

  if (scouts.length === 0) {
    return {
      merged: null,
      legs: {},
      scoutCount: 0,
      searchActionId,
    };
  }

  const runs = await Promise.all(
    scouts.map((row) =>
      runContextConditionAnchorPin({
        contextEventId: input.contextEventId,
        anchorPlaceId: input.anchorPlaceId,
        anchorPlaceName: input.anchorPlaceName,
        anchorLat: input.anchorLat,
        anchorLng: input.anchorLng,
        anchorPriceKrw: input.anchorPriceKrw,
        message: `${input.triggerMessage} · ${row.labelKo}`,
        spec: row.spec,
        discoveryOrigin: input.discoveryOrigin ?? null,
        skipSearchActionLog: true,
      }),
    ),
  );

  const legs: Partial<Record<TripExperienceScoutLeg, ContextConditionAnchorPinOutcome | null>> =
    {};
  scouts.forEach((row, index) => {
    legs[row.leg] = runs[index] ?? null;
  });

  const merged = mergeTripExperienceScoutOutcomes(legs);
  if (merged) {
    writeContextConditionLastBatch(input.contextEventId, {
      batchId: merged.batchId,
      count: merged.lodgingCount + merged.eateryCount,
      summaryKo: merged.summaryKo,
      atIso: new Date().toISOString(),
      radiusM: merged.radiusM,
      spec: merged.spec,
      recommendations: merged.recommendations.map((row) => ({
        kind: row.kind,
        activitySubtype: row.activitySubtype ?? null,
        title: row.title,
        reasonKo: row.reasonKo,
        placeId: row.placeId,
        lat: row.lat,
        lng: row.lng,
      })),
    });
  }

  return {
    merged,
    legs,
    scoutCount: scouts.length,
    searchActionId,
  };
}
