import { resolveStableContextPlaceAnchor } from "@/lib/context-instance/build-context-instance";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { resolveContextDiscoverySearchCoords } from "@/lib/globe/context-hub/resolve-context-discovery-search-coords";
import { commitEateryInventoryToEvent } from "@/lib/globe/eatery/commit-eatery-inventory";
import { loadEateryInventoryRows } from "@/lib/globe/eatery/load-eatery-inventory-rows";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import { composeBrainProjectionManifest } from "@/lib/situation-projection/compose-brain-projection";
import { resolveBrainQuestionRoute } from "@/lib/situation-projection/brain-question-router";

const MIN_TRAVEL_EATERY_ROWS = 3;

/** Travel brain map — prefetch named eateries (with images) before macro ghosts render. */
export async function ensureTravelBrainMicroInventory(input: {
  event: EventCandidate;
  lat?: number | null;
  lng?: number | null;
}): Promise<boolean> {
  const route = resolveBrainQuestionRoute(input.event);
  if (route.policy?.sectorId !== "travel") {
    return false;
  }

  if (readEateryInventoryRows(input.event).length >= MIN_TRAVEL_EATERY_ROWS) {
    return false;
  }

  const origin = resolveContextDiscoverySearchCoords(input.event, {
    viewerLat: input.lat,
    viewerLng: input.lng,
  });
  const anchor = resolveStableContextPlaceAnchor(input.event);
  const searchLat = origin.lat ?? anchor.lat;
  const searchLng = origin.lng ?? anchor.lng;

  const loaded = await loadEateryInventoryRows({
    event: input.event,
    lat: searchLat,
    lng: searchLng,
    maxResults: 4,
    preferUserLocation: false,
  });

  if (loaded.rows.length === 0) {
    return false;
  }

  commitEateryInventoryToEvent({
    event: input.event,
    inventory: loaded.rows,
    inventorySource: loaded.source,
  });

  const refreshed = findLifeEventCandidate(input.event.id) ?? input.event;
  composeBrainProjectionManifest({
    event: refreshed,
    trigger: { source: "manual", atIso: new Date().toISOString() },
  });

  return true;
}
