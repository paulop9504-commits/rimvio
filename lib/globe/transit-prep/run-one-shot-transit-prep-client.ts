"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { recordEngineLifecycleClient } from "@/lib/engine/record-engine-lifecycle";
import {
  planOneShotTransitPrep,
  type OneShotTransitPrepPlan,
} from "@/lib/globe/transit-prep/plan-one-shot-transit-prep";
import { writeTripIntakePartial } from "@/lib/globe/trip-intake/write-trip-intake-partial";
import { readTripIntakeState } from "@/lib/globe/trip-intake/read-trip-intake-state";

export type RunOneShotTransitPrepResult = {
  readonly plan: OneShotTransitPrepPlan;
  readonly event: EventCandidate | null;
};

/** Client — persist transit destination before NAVIGATE Field open. */
export function runOneShotTransitPrepClient(input: {
  message: string;
  contextEventId: string;
  event: EventCandidate | null | undefined;
}): RunOneShotTransitPrepResult | null {
  const plan = planOneShotTransitPrep({
    message: input.message,
    event: input.event,
  });
  if (!plan) {
    return null;
  }

  let event = input.event ?? null;
  const contextEventId = input.contextEventId.trim();
  if (!contextEventId) {
    return { plan, event };
  }

  const base = readTripIntakeState({ event, message: input.message });
  const destinationLabel = plan.transitState.destinationLabel ?? base.destinationLabel;
  if (destinationLabel?.trim()) {
    event = writeTripIntakePartial({
      contextEventId,
      state: {
        destinationLabel,
        originLabel: plan.transitState.originLabel ?? base.originLabel,
        checkInIso: base.checkInIso,
        checkOutIso: base.checkOutIso,
        guestCount: base.guestCount ?? 1,
        budgetBand: base.budgetBand ?? "balanced",
      },
    });
  }

  return { plan, event };
}

export type CommitOneShotTransitMainResult = {
  readonly committed: boolean;
  readonly destination: string | null;
};

/** Prepare transit MAIN — destination pinned on Context (no external commit). */
export function commitOneShotTransitMainClient(input: {
  contextEventId: string;
  triggerMessage: string;
  event: EventCandidate | null | undefined;
  prepResult?: RunOneShotTransitPrepResult | null;
}): CommitOneShotTransitMainResult {
  const prep =
    input.prepResult?.plan ??
    planOneShotTransitPrep({
      message: input.triggerMessage,
      event: input.event,
    });
  if (!prep?.readyForNavigate) {
    return { committed: false, destination: null };
  }

  const destination = prep.transitState.destinationLabel?.trim();
  if (!destination) {
    return { committed: false, destination: null };
  }

  recordEngineLifecycleClient({
    contextEventId: input.contextEventId,
    engineId: "transit_navigate",
    kind: "main_selected",
    payload: { destination },
  });

  return { committed: true, destination };
}
