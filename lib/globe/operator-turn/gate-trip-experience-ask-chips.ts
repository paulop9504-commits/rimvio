import type { EventCandidate } from "@/lib/events/event-candidate";
import { buildTripExperienceAskChips } from "@/lib/globe/trip-experience/build-trip-experience-ask-chips";
import { isTripExperienceUtterance } from "@/lib/globe/trip-experience/detect-trip-experience-utterance";
import { planOneShotTripExperiencePrep } from "@/lib/globe/trip-experience/plan-one-shot-trip-experience-prep";
import type { OperatorTurnPlan } from "@/lib/globe/operator-turn/types";

/** Gate — exploratory trip → ask_chips before parallel scout. */
export function gateTripExperienceAskChips(input: {
  text: string;
  event: EventCandidate | null | undefined;
  userLat?: number | null;
  userLng?: number | null;
  now?: Date;
}): OperatorTurnPlan | null {
  if (!isTripExperienceUtterance(input.text)) {
    return null;
  }

  const plan = planOneShotTripExperiencePrep({
    message: input.text,
    event: input.event,
    userLat: input.userLat,
    userLng: input.userLng,
    now: input.now,
  });
  if (!plan || plan.experienceGaps.length === 0 || plan.readyForScout) {
    return null;
  }

  const chips = buildTripExperienceAskChips(plan.experienceGaps);
  if (chips.length === 0) {
    return null;
  }

  return {
    tool: "ask_chips",
    reason: "trip_experience_gap",
    chips,
  };
}
