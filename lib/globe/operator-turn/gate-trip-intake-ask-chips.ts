import type { EventCandidate } from "@/lib/events/event-candidate";
import { isInstantLodgingSearch, requiresLodgingBookingSlots } from "@/lib/globe/context-condition-ai/instant-lodging-search";
import { planOneShotLodgingPrep } from "@/lib/globe/lodging-prep/plan-one-shot-lodging-prep";
import type { OperatorTurnPlan } from "@/lib/globe/operator-turn/types";
import { buildTripIntakeAskChips } from "@/lib/globe/trip-intake/build-trip-intake-ask-chips";

function isLodgingPrepUtterance(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  return (
    requiresLodgingBookingSlots(trimmed) ||
    isInstantLodgingSearch(trimmed) ||
    /(?:숙소|호텔|lodging|hotel).{0,24}(?:준비|예약|잡|찾)/iu.test(trimmed)
  );
}

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
