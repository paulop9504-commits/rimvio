import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import { mapLodgingRowToContextResource } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { GLOBE_CONTEXT_VISIBILITY_PRIVATE } from "@/lib/globe/globe-context-visibility";
import type { PersonalGlobePin } from "@/lib/globe/personal-globe-pin-types";
import {
  listPersonalGlobePins,
  removePersonalGlobePinByEventId,
  upsertPersonalGlobePin,
} from "@/lib/globe/personal-globe-pin-store";
import type { EventCandidate } from "@/lib/events/event-candidate";

function accommodationPinEventId(contextEventId: string, placeId: string): string {
  return `${contextEventId.trim()}:acc:${placeId.trim()}`;
}

function accommodationPinId(contextEventId: string, placeId: string): string {
  return `pgpin:${accommodationPinEventId(contextEventId, placeId)}`;
}

function listAccommodationSearchPinsForContext(
  contextEventId: string,
): PersonalGlobePin[] {
  const key = contextEventId.trim();
  return listPersonalGlobePins().filter(
    (pin) =>
      pin.source === "accommodation_search" && pin.parentContextEventId === key,
  );
}

/** Replace prior search pins — one private pin per lodging row. */
export function syncAccommodationSearchPins(input: {
  contextEvent: EventCandidate;
  rows: readonly ContextLodgingInventoryRow[];
  now?: Date;
}): PersonalGlobePin[] {
  const contextEventId = input.contextEvent.id.trim();
  const nowIso = (input.now ?? new Date()).toISOString();
  const nextPlaceIds = new Set(input.rows.map((row) => row.placeId.trim()));

  for (const existing of listAccommodationSearchPinsForContext(contextEventId)) {
    const placeId = existing.eventId.split(":acc:").pop()?.trim();
    if (!placeId || !nextPlaceIds.has(placeId)) {
      removePersonalGlobePinByEventId(existing.eventId);
    }
  }

  const pins: PersonalGlobePin[] = [];
  for (const row of input.rows) {
    const resource = mapLodgingRowToContextResource(input.contextEvent, row);
    const eventId = accommodationPinEventId(contextEventId, row.placeId);
    const pin: PersonalGlobePin = {
      pinId: accommodationPinId(contextEventId, row.placeId),
      eventId,
      lat: row.lat,
      lng: row.lng,
      placeLabel: row.name,
      experienceTitle: row.name,
      photoCount: row.images.length,
      videoCount: row.videoUrl ? 1 : 0,
      createdAtIso: nowIso,
      acl: { viewerPeerThreadIds: [] },
      visibility: GLOBE_CONTEXT_VISIBILITY_PRIVATE,
      source: "accommodation_search",
      parentContextEventId: contextEventId,
    };
    upsertPersonalGlobePin(pin);
    pins.push(pin);
    void resource;
  }

  return pins;
}

export function listAccommodationSearchPins(
  contextEventId: string,
): PersonalGlobePin[] {
  return listAccommodationSearchPinsForContext(contextEventId);
}
