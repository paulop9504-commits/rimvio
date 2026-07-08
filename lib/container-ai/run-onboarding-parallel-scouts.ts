/**
 * Run stay + explore scouts in parallel for broad travel onboarding.
 * Merges recommendations into one batch for the globe reel/map.
 */

import {
  runContextConditionAnchorPin,
  type ContextConditionAnchorPinOutcome,
} from "@/lib/globe/context-condition-ai";
import { writeContextConditionLastBatch } from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";
import type { DiscoverySearchOrigin } from "@/lib/globe/discovery-lens/types";
import {
  buildOnboardingParallelMapScouts,
  onboardingParallelIncludesDeparture,
} from "@/lib/container-ai/build-onboarding-parallel-specs";
import { emitSearchHubAction } from "@/lib/globe/resource/hub-action-record-store";

export type OnboardingParallelScoutRunInput = {
  contextEventId: string;
  triggerMessage: string;
  destinationLabel: string;
  parallelNodeIds: readonly string[];
  anchorPlaceId: string;
  anchorPlaceName: string;
  anchorLat: number;
  anchorLng: number;
  anchorPriceKrw?: number | null;
  discoveryOrigin?: DiscoverySearchOrigin | null;
  /** Optional Operator Runtime id for HubActionRecord audit. */
  operatorRuntimeId?: string | null;
};

export type OnboardingParallelScoutRunResult = {
  readonly merged: ContextConditionAnchorPinOutcome | null;
  readonly lodging: ContextConditionAnchorPinOutcome | null;
  readonly activity: ContextConditionAnchorPinOutcome | null;
  readonly includesDepartureAnnounce: boolean;
  readonly mapScoutCount: number;
  /** Append-only search log emit (resourceId always null). */
  readonly searchActionId: string | null;
};

function mergeOutcomes(input: {
  lodging: ContextConditionAnchorPinOutcome | null;
  activity: ContextConditionAnchorPinOutcome | null;
}): ContextConditionAnchorPinOutcome | null {
  const lodging = input.lodging;
  const activity = input.activity;
  if (!lodging && !activity) {
    return null;
  }
  const primary = lodging ?? activity!;
  const secondary = lodging && activity ? activity : null;
  const recommendations = [
    ...(lodging?.recommendations ?? []),
    ...(activity?.recommendations ?? []),
  ];
  const lodgingCount = lodging?.lodgingCount ?? 0;
  const eateryCount =
    (lodging?.eateryCount ?? 0) + (activity?.eateryCount ?? 0);
  const pinPoints = [
    ...(lodging?.pinPoints ?? []),
    ...(activity?.pinPoints ?? []),
  ];
  const parts: string[] = [];
  if (lodgingCount > 0) {
    parts.push(`숙소 ${lodgingCount}`);
  }
  if ((activity?.recommendations.length ?? 0) > 0) {
    parts.push(`놀거리 ${activity!.recommendations.length}`);
  }
  const summaryKo =
    parts.length > 0
      ? `${parts.join(" · ")}곳을 지도에 같이 띄웠어요`
      : primary.summaryKo;

  return {
    ...primary,
    batchId: `parallel-${primary.batchId}${secondary ? `-${secondary.batchId}` : ""}`,
    lodgingCount,
    eateryCount,
    recommendations,
    pinPoints,
    summaryKo,
    radiusM: Math.max(primary.radiusM, secondary?.radiusM ?? 0),
    spec: lodging?.spec ?? activity!.spec,
  };
}

export async function runOnboardingParallelMapScouts(
  input: OnboardingParallelScoutRunInput,
): Promise<OnboardingParallelScoutRunResult> {
  const mapScouts = buildOnboardingParallelMapScouts({
    parallelNodeIds: input.parallelNodeIds,
    destinationLabel: input.destinationLabel,
  });
  const includesDepartureAnnounce = onboardingParallelIncludesDeparture(
    input.parallelNodeIds,
  );

  // 3-layer: search log only — no ContextResource until Reality Commit.
  const searchEmit = emitSearchHubAction({
    contextEventId: input.contextEventId,
    sourceHubId: "hub.onboarding_parallel",
    operatorRuntimeId: input.operatorRuntimeId?.trim() || undefined,
    approvalPolicy: "user_tap",
    payload: {
      query: input.triggerMessage.trim() || input.destinationLabel,
      filters: {
        destinationLabel: input.destinationLabel,
        parallelNodeIds: [...input.parallelNodeIds],
        mapScoutNodeIds: mapScouts.map((row) => row.nodeId),
      },
    },
  });
  const searchActionId = searchEmit.ok ? searchEmit.action.actionId : null;

  if (mapScouts.length === 0) {
    return {
      merged: null,
      lodging: null,
      activity: null,
      includesDepartureAnnounce,
      mapScoutCount: 0,
      searchActionId,
    };
  }

  const runs = await Promise.all(
    mapScouts.map((row) =>
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

  let lodging: ContextConditionAnchorPinOutcome | null = null;
  let activity: ContextConditionAnchorPinOutcome | null = null;
  mapScouts.forEach((row, index) => {
    const outcome = runs[index] ?? null;
    if (row.nodeId === "stay") {
      lodging = outcome;
    } else if (row.nodeId === "explore") {
      activity = outcome;
    }
  });

  const merged = mergeOutcomes({ lodging, activity });
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
    lodging,
    activity,
    includesDepartureAnnounce,
    mapScoutCount: mapScouts.length,
    searchActionId,
  };
}
