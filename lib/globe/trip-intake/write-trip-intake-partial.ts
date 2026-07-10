import type { EventCandidate } from "@/lib/events/event-candidate";
import { writeLodgingBookingSlots } from "@/lib/globe/context-hub/lodging-booking-slots";
import { hasCompleteTripIntake } from "@/lib/globe/trip-intake/assess-trip-intake-gaps";
import {
  CONTEXT_TRIP_BUDGET_BAND_META_KEY,
  CONTEXT_TRIP_INTAKE_COMPLETE_META_KEY,
  CONTEXT_TRIP_ORIGIN_LABEL_META_KEY,
} from "@/lib/globe/trip-intake/trip-intake-metadata-keys";
import type { TripIntakeState } from "@/lib/globe/trip-intake/types";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

/** Persist whatever trip intake slots are known — no throw on partial. */
export function writeTripIntakePartial(input: {
  contextEventId: string;
  state: TripIntakeState;
}): EventCandidate {
  const contextEventId = input.contextEventId.trim();
  const base = findLifeEventCandidate(contextEventId);
  if (!base) {
    throw new Error("trip_intake_context_missing");
  }

  let event = base;
  if (
    input.state.checkInIso &&
    input.state.checkOutIso &&
    input.state.guestCount &&
    input.state.guestCount > 0
  ) {
    event = writeLodgingBookingSlots({
      contextEventId,
      checkInIso: input.state.checkInIso,
      checkOutIso: input.state.checkOutIso,
      guestCount: input.state.guestCount,
      roomCount: 1,
    });
  }

  const metadata = { ...(event.metadata ?? {}) };
  if (input.state.originLabel?.trim()) {
    metadata[CONTEXT_TRIP_ORIGIN_LABEL_META_KEY] = input.state.originLabel.trim();
  }
  if (input.state.budgetBand) {
    metadata[CONTEXT_TRIP_BUDGET_BAND_META_KEY] = input.state.budgetBand;
  }
  metadata[CONTEXT_TRIP_INTAKE_COMPLETE_META_KEY] = hasCompleteTripIntake(input.state);

  const updatedAt = new Date().toISOString();
  return commitEventUpsert({
    id: event.id,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: input.state.checkInIso ?? event.datetime,
    place: input.state.destinationLabel?.trim() || event.place,
    description: event.description,
    confidence: event.confidence,
    lifecycleUpdatedAt: updatedAt,
    updatedAt,
    metadata,
  });
}
