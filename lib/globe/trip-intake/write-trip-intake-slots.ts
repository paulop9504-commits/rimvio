import type { EventCandidate } from "@/lib/events/event-candidate";
import { writeLodgingBookingSlots } from "@/lib/globe/context-hub/lodging-booking-slots";
import {
  CONTEXT_TRIP_BUDGET_BAND_META_KEY,
  CONTEXT_TRIP_INTAKE_COMPLETE_META_KEY,
  CONTEXT_TRIP_ORIGIN_LABEL_META_KEY,
} from "@/lib/globe/trip-intake/trip-intake-metadata-keys";
import type { TripIntakeWriteInput } from "@/lib/globe/trip-intake/types";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

/** Persist trip intake → Context metadata + lodging stay window. */
export function writeTripIntakeSlots(input: TripIntakeWriteInput): EventCandidate {
  const contextEventId = input.contextEventId.trim();
  const destinationLabel = input.destinationLabel.trim();
  const originLabel = input.originLabel.trim();
  if (!contextEventId || !destinationLabel || !originLabel) {
    throw new Error("trip_intake_invalid");
  }

  const lodgingUpdated = writeLodgingBookingSlots({
    contextEventId,
    checkInIso: input.checkInIso,
    checkOutIso: input.checkOutIso,
    guestCount: input.guestCount,
    roomCount: 1,
  });

  const updatedAt = new Date().toISOString();
  return commitEventUpsert({
    id: lodgingUpdated.id,
    title: lodgingUpdated.title,
    category: lodgingUpdated.category,
    source: lodgingUpdated.source,
    lifecycle: lodgingUpdated.lifecycle,
    datetime: input.checkInIso,
    place: destinationLabel,
    description: lodgingUpdated.description,
    confidence: lodgingUpdated.confidence,
    lifecycleUpdatedAt: updatedAt,
    updatedAt,
    metadata: {
      ...(lodgingUpdated.metadata ?? {}),
      [CONTEXT_TRIP_ORIGIN_LABEL_META_KEY]: originLabel,
      [CONTEXT_TRIP_BUDGET_BAND_META_KEY]: input.budgetBand,
      [CONTEXT_TRIP_INTAKE_COMPLETE_META_KEY]: true,
    },
  });
}

export function readTripIntakeComplete(
  event: EventCandidate | null | undefined,
): boolean {
  return event?.metadata?.[CONTEXT_TRIP_INTAKE_COMPLETE_META_KEY] === true;
}

export function refreshTripIntakeEvent(contextEventId: string): EventCandidate | null {
  return findLifeEventCandidate(contextEventId.trim());
}
