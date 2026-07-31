import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import type { PersonalGlobePin } from "@/lib/globe/personal-globe-pin-types";
import {
  listPersonalGlobePins,
  removePersonalGlobePinByEventId,
} from "@/lib/globe/personal-globe-pin-store";
import type { EventCandidate } from "@/lib/events/event-candidate";

function listAccommodationSearchPinsForContext(
  contextEventId: string,
): PersonalGlobePin[] {
  const key = contextEventId.trim();
  return listPersonalGlobePins().filter(
    (pin) =>
      pin.source === "accommodation_search" && pin.parentContextEventId === key,
  );
}

/**
 * Reality OS — lodging SEARCH must not upsert 3D Globe pins before Commit.
 * Clears any leftover accommodation_search pins; inventory lives in Workspace.
 */
export function syncAccommodationSearchPins(input: {
  contextEvent: EventCandidate;
  rows: readonly ContextLodgingInventoryRow[];
  now?: Date;
}): PersonalGlobePin[] {
  const contextEventId = input.contextEvent.id.trim();
  for (const existing of listAccommodationSearchPinsForContext(contextEventId)) {
    removePersonalGlobePinByEventId(existing.eventId);
  }
  void input.rows;
  void input.now;
  return [];
}

export function listAccommodationSearchPins(
  contextEventId: string,
): PersonalGlobePin[] {
  return listAccommodationSearchPinsForContext(contextEventId);
}
