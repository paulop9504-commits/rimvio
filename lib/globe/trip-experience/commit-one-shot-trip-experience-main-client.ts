"use client";

import { appendLodgingRoomCardsComposeTurn } from "@/lib/globe/assistant";
import type { ContextConditionAnchorPinOutcome } from "@/lib/globe/context-condition-ai";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { resolveLodgingRoomCardStep } from "@/lib/globe/hub-checkout/resolve-lodging-hub-checkout-session";
import { planOneShotTripExperiencePrep } from "@/lib/globe/trip-experience/plan-one-shot-trip-experience-prep";
import {
  pinTripExperienceMainLegsToContext,
  type TripExperienceMainLegCommit,
} from "@/lib/globe/trip-experience/pin-trip-experience-main-legs-client";
import { resolveTripExperienceMainByLeg } from "@/lib/globe/trip-experience/resolve-trip-experience-main-by-leg";
import type { RunOneShotTripExperiencePrepResult } from "@/lib/globe/trip-experience/run-one-shot-trip-experience-prep-client";
import type { TripExperienceScoutLeg } from "@/lib/globe/trip-experience/build-trip-experience-parallel-scouts";
import {
  isTripExperienceScoutBatchId,
} from "@/lib/globe/trip-experience/trip-experience-main-leg-types";
import { recordEngineLifecycleClient, recordEngineScoutFailureClient } from "@/lib/engine/record-engine-lifecycle";
import { findLifeEventCandidate } from "@/lib/life-read-model";

export type CommitOneShotTripExperienceMainResult = {
  readonly committed: boolean;
  readonly legs: Partial<Record<TripExperienceScoutLeg, string | null>>;
};

/** After parallel scout — auto-pin rank-1 per leg; no express until user taps. */
export function commitOneShotTripExperienceMainClient(input: {
  contextEventId: string;
  triggerMessage: string;
  outcome: ContextConditionAnchorPinOutcome;
  event: EventCandidate | null | undefined;
  userLat?: number | null;
  userLng?: number | null;
  prepResult?: RunOneShotTripExperiencePrepResult | null;
}): CommitOneShotTripExperienceMainResult {
  const emptyLegs: Partial<Record<TripExperienceScoutLeg, string | null>> = {
    lodging: null,
    eatery: null,
    activity: null,
  };

  if (!isTripExperienceScoutBatchId(input.outcome.batchId)) {
    return { committed: false, legs: emptyLegs };
  }

  const prep =
    input.prepResult?.plan ??
    planOneShotTripExperiencePrep({
      message: input.triggerMessage,
      event: input.event,
      userLat: input.userLat,
      userLng: input.userLng,
    });
  if (!prep?.readyForScout) {
    return { committed: false, legs: emptyLegs };
  }

  const mains = resolveTripExperienceMainByLeg(
    input.outcome.recommendations,
    prep.scoutLegs,
  );
  const commits: TripExperienceMainLegCommit[] = [];
  for (const leg of prep.scoutLegs) {
    const main = mains[leg];
    if (main?.placeId) {
      commits.push({ leg, recommendation: main });
    }
  }
  if (commits.length === 0) {
    recordEngineScoutFailureClient({
      contextEventId: input.contextEventId,
      engineId: "trip_experience_search",
      lastError: "no_main_legs",
      payload: { batchId: input.outcome.batchId },
    });
    return { committed: false, legs: emptyLegs };
  }

  pinTripExperienceMainLegsToContext({
    eventId: input.contextEventId,
    legs: commits,
    primaryLeg: prep.scoutLegs[0] ?? commits[0]!.leg,
  });

  const lodgingMain = mains.lodging;
  if (lodgingMain?.placeId) {
    const refreshedEvent =
      findLifeEventCandidate(input.contextEventId) ?? input.event ?? null;
    const step = refreshedEvent
      ? resolveLodgingRoomCardStep(refreshedEvent, lodgingMain.placeId)
      : null;
    if (step) {
      appendLodgingRoomCardsComposeTurn(input.contextEventId, {
        placeId: lodgingMain.placeId,
        resourceId: step.resourceId,
        title: lodgingMain.title,
      });
    }
  }

  recordEngineLifecycleClient({
    contextEventId: input.contextEventId,
    engineId: "trip_experience_search",
    kind: "main_selected",
    payload: {
      batchId: input.outcome.batchId,
      legs: commits.map((row) => row.leg),
    },
  });

  return {
    committed: true,
    legs: {
      lodging: mains.lodging?.placeId ?? null,
      eatery: mains.eatery?.placeId ?? null,
      activity: mains.activity?.placeId ?? null,
    },
  };
}
