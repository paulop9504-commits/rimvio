import type { EventCandidate } from "@/lib/events/event-candidate";
import { readTripIntakeState } from "@/lib/globe/trip-intake/read-trip-intake-state";
import { inferTripFunAxisFromMessage } from "@/lib/globe/trip-experience/infer-trip-fun-axis-from-message";
import {
  CONTEXT_TRIP_DESTINATION_SCOPE_META_KEY,
  CONTEXT_TRIP_FUN_AXIS_META_KEY,
} from "@/lib/globe/trip-experience/trip-experience-metadata-keys";
import type {
  TripDestinationScope,
  TripExperienceState,
  TripFunAxis,
} from "@/lib/globe/trip-experience/types";

function asFunAxis(value: unknown): TripFunAxis | null {
  return value === "food_market" ||
    value === "nature" ||
    value === "festival" ||
    value === "culture" ||
    value === "open"
    ? value
    : null;
}

function asDestinationScope(value: unknown): TripDestinationScope | null {
  return value === "domestic_near" ||
    value === "domestic_far" ||
    value === "abroad" ||
    value === "open"
    ? value
    : null;
}

/** Merge trip temporal + experience metadata + message cues. */
export function readTripExperienceState(input: {
  event: EventCandidate | null | undefined;
  message?: string | null;
  userLat?: number | null;
  userLng?: number | null;
  now?: Date;
}): TripExperienceState {
  const trip = readTripIntakeState({
    event: input.event,
    message: input.message,
    userLat: input.userLat,
    userLng: input.userLng,
    now: input.now,
  });
  const metadata = input.event?.metadata ?? {};
  const funAxis =
    asFunAxis(metadata[CONTEXT_TRIP_FUN_AXIS_META_KEY]) ??
    inferTripFunAxisFromMessage(input.message);
  const destinationScope = asDestinationScope(
    metadata[CONTEXT_TRIP_DESTINATION_SCOPE_META_KEY],
  );

  return {
    funAxis,
    destinationScope,
    destinationLabel: trip.destinationLabel,
    checkInIso: trip.checkInIso,
    checkOutIso: trip.checkOutIso,
    guestCount: trip.guestCount,
    budgetBand: trip.budgetBand,
  };
}
