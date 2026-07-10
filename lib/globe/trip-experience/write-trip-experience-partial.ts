import type { EventCandidate } from "@/lib/events/event-candidate";
import { writeLodgingBookingSlots } from "@/lib/globe/context-hub/lodging-booking-slots";
import { hasCompleteTripExperience } from "@/lib/globe/trip-experience/assess-trip-experience-gaps";
import {
  CONTEXT_TRIP_EXPERIENCE_COMPLETE_META_KEY,
  CONTEXT_TRIP_DESTINATION_SCOPE_META_KEY,
  CONTEXT_TRIP_FUN_AXIS_META_KEY,
} from "@/lib/globe/trip-experience/trip-experience-metadata-keys";
import { CONTEXT_TRIP_BUDGET_BAND_META_KEY } from "@/lib/globe/trip-intake/trip-intake-metadata-keys";
import type { TripExperienceState } from "@/lib/globe/trip-experience/types";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

/** Persist experience slots on Context (partial OK). */
export function writeTripExperiencePartial(input: {
  contextEventId: string;
  state: TripExperienceState;
}): EventCandidate {
  const contextEventId = input.contextEventId.trim();
  const base = findLifeEventCandidate(contextEventId);
  if (!base) {
    throw new Error("trip_experience_context_missing");
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
  if (input.state.funAxis) {
    metadata[CONTEXT_TRIP_FUN_AXIS_META_KEY] = input.state.funAxis;
  }
  if (input.state.destinationScope) {
    metadata[CONTEXT_TRIP_DESTINATION_SCOPE_META_KEY] = input.state.destinationScope;
  }
  if (input.state.budgetBand) {
    metadata[CONTEXT_TRIP_BUDGET_BAND_META_KEY] = input.state.budgetBand;
  }
  metadata[CONTEXT_TRIP_EXPERIENCE_COMPLETE_META_KEY] = hasCompleteTripExperience(
    input.state,
  );

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
