import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  EVENT_SERVICE_TYPE_ACCOMMODATION,
  EVENT_SERVICE_TYPE_META_KEY,
} from "@/lib/events/event-metadata-keys";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export function readEventServiceType(
  event: EventCandidate | null | undefined,
): string | null {
  const raw = event?.metadata?.[EVENT_SERVICE_TYPE_META_KEY];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export function eventHasAccommodationServiceType(
  event: EventCandidate | null | undefined,
): boolean {
  return readEventServiceType(event) === EVENT_SERVICE_TYPE_ACCOMMODATION;
}

/** Stamp accommodation service_type on EventCandidate after kernel intent match. */
export function stampAccommodationServiceTypeOnEvent(
  eventId: string,
): EventCandidate | null {
  const event = findLifeEventCandidate(eventId.trim());
  if (!event) {
    return null;
  }
  if (eventHasAccommodationServiceType(event)) {
    return event;
  }

  const stamp = new Date().toISOString();
  return commitEventUpsert({
    id: event.id,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: event.datetime,
    place: event.place,
    description: event.description,
    metadata: {
      ...(event.metadata ?? {}),
      [EVENT_SERVICE_TYPE_META_KEY]: EVENT_SERVICE_TYPE_ACCOMMODATION,
    },
    confidence: event.confidence,
    lifecycleUpdatedAt: stamp,
    updatedAt: stamp,
  });
}
