import type { EventCandidate } from "@/lib/events/event-candidate";
import { isLodgingPrepUtterance } from "@/lib/globe/lodging-prep/is-lodging-prep-utterance";
import { planOneShotLodgingPrep } from "@/lib/globe/lodging-prep/plan-one-shot-lodging-prep";
import type { OperatorTurnPlan } from "@/lib/globe/operator-turn/types";
import { buildTripIntakeAskChips } from "@/lib/globe/trip-intake/build-trip-intake-ask-chips";

/** Gate — ambiguous trip intake → ask_chips once before scout. */
export function gateTripIntakeAskChips(input: {
  text: string;
  event: EventCandidate | null | undefined;
  userLat?: number | null;
  userLng?: number | null;
  now?: Date;
}): OperatorTurnPlan | null {
  if (!isLodgingPrepUtterance(input.text)) {
    return null;
  }

  const plan = planOneShotLodgingPrep({
    message: input.text,
    event: input.event,
    userLat: input.userLat,
    userLng: input.userLng,
    now: input.now,
  });
  if (!plan || plan.intakeGaps.length === 0 || plan.readyForScout) {
    return null;
  }

  const chips = buildTripIntakeAskChips(plan.intakeGaps);
  if (chips.length === 0) {
    return null;
  }

  return {
    tool: "ask_chips",
    reason: "trip_intake_gap",
    chips,
  };
}
