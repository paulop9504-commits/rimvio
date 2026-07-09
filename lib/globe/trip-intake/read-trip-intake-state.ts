import { extractTravelDestination } from "@/lib/action-chat/try-travel-trip-announcement";
import type { ContextBlueprint } from "@/lib/context-blueprint/types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { readLodgingBookingSlots } from "@/lib/globe/context-hub/lodging-booking-slots";
import {
  CONTEXT_TRIP_BUDGET_BAND_META_KEY,
  CONTEXT_TRIP_ORIGIN_LABEL_META_KEY,
} from "@/lib/globe/trip-intake/trip-intake-metadata-keys";
import type {
  TripBudgetBand,
  TripIntakeState,
} from "@/lib/globe/trip-intake/types";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import { buildTravelBrainState } from "@/lib/situation-projection/travel-brain-personalization";

function asTrimmed(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asBudgetBand(value: unknown): TripBudgetBand | null {
  return value === "value" || value === "balanced" || value === "premium"
    ? value
    : null;
}

function readDestinationFromBlueprint(
  blueprint: ContextBlueprint | null | undefined,
): string | null {
  const label = blueprint?.constraints.destination?.label;
  return asTrimmed(label);
}

/** Merge Context + plan + travel brain into one intake snapshot. */
export function readTripIntakeState(input: {
  event: EventCandidate | null | undefined;
  message?: string | null;
  blueprint?: ContextBlueprint | null;
}): TripIntakeState {
  const event = input.event;
  if (!event) {
    return {
      destinationLabel: null,
      originLabel: null,
      checkInIso: null,
      checkOutIso: null,
      guestCount: null,
      budgetBand: null,
    };
  }

  const metadata = event.metadata ?? {};
  const lodgingSlots = readLodgingBookingSlots(event);
  const plan = readPlanContextFromEvent(event);
  const travelBrain = buildTravelBrainState(event);

  const destinationLabel =
    readDestinationFromBlueprint(input.blueprint) ??
    (input.message ? extractTravelDestination(input.message) : null) ??
    asTrimmed(event.place) ??
    (asTrimmed(travelBrain.destinationLabel) !== "여행"
      ? asTrimmed(travelBrain.destinationLabel)
      : null);

  const originLabel = asTrimmed(metadata[CONTEXT_TRIP_ORIGIN_LABEL_META_KEY]);

  const budgetFromMeta = asBudgetBand(metadata[CONTEXT_TRIP_BUDGET_BAND_META_KEY]);
  const budgetFromBrain =
    travelBrain.slots.budget_band.confidence >= 0.75
      ? travelBrain.slots.budget_band.value
      : null;

  return {
    destinationLabel,
    originLabel,
    checkInIso: lodgingSlots.checkInIso ?? plan?.windowStartIso ?? null,
    checkOutIso: lodgingSlots.checkOutIso ?? plan?.windowEndIso ?? null,
    guestCount: lodgingSlots.guestCount,
    budgetBand: budgetFromMeta ?? budgetFromBrain,
  };
}
