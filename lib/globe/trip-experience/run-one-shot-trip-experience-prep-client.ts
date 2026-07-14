"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { planOneShotTripExperiencePrep } from "@/lib/globe/trip-experience/plan-one-shot-trip-experience-prep";
import { writeTripExperiencePartial } from "@/lib/globe/trip-experience/write-trip-experience-partial";
import type { OneShotTripExperiencePrepPlan } from "@/lib/globe/trip-experience/plan-one-shot-trip-experience-prep";

export type RunOneShotTripExperiencePrepResult = {
  readonly plan: OneShotTripExperiencePrepPlan;
  readonly event: EventCandidate | null;
};

/** Client — persist experience slots before parallel scout. */
export function runOneShotTripExperiencePrepClient(input: {
  message: string;
  contextEventId: string;
  event: EventCandidate | null | undefined;
  userLat?: number | null;
  userLng?: number | null;
  now?: Date;
}): RunOneShotTripExperiencePrepResult | null {
  const plan = planOneShotTripExperiencePrep(input);
  if (!plan) {
    return null;
  }

  let event = input.event ?? null;
  const contextEventId = input.contextEventId.trim();
  if (!contextEventId) {
    return { plan, event };
  }

  event = writeTripExperiencePartial({
    contextEventId,
    state: {
      ...plan.experienceState,
      guestCount: plan.experienceState.guestCount ?? 2,
      budgetBand: plan.experienceState.budgetBand ?? "balanced",
    },
  });

  return { plan, event };
}
