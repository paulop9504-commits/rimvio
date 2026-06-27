import type { EventCandidate } from "@/lib/events/event-candidate";
import { fetchPlacesEateryNearby } from "@/lib/globe/eatery/fetch-places-eatery-nearby";
import { resolveEateryMockNearUser } from "@/lib/globe/eatery/eatery-mock-inventory";
import type { ContextEateryInventoryRow } from "@/lib/globe/eatery/eatery-resource-types";
import { filterLodgingRowsWithinRadius } from "@/lib/globe/lodging/project-lodging-discovery-session";
import { LODGING_DISCOVERY_RADIUS_M } from "@/lib/globe/lodging/lodging-discovery-constants";
import { resolveContextLodgingSearchCoords } from "@/lib/globe/context-hub/resolve-context-lodging-search-coords";

export type EateryInventorySource = "google_places" | "mock";

export type LoadedEateryInventory = {
  rows: ContextEateryInventoryRow[];
  source: EateryInventorySource;
};

async function fetchEateryInventoryFromApi(input: {
  lat: number;
  lng: number;
  maxResults?: number;
  radiusM?: number;
}): Promise<ContextEateryInventoryRow[]> {
  const params = new URLSearchParams({
    lat: String(input.lat),
    lng: String(input.lng),
    max: String(input.maxResults ?? 5),
    radiusM: String(input.radiusM ?? LODGING_DISCOVERY_RADIUS_M),
  });
  const response = await fetch(`/api/globe/eatery-inventory?${params.toString()}`);
  if (!response.ok) {
    return [];
  }
  const body = (await response.json()) as { inventory?: ContextEateryInventoryRow[] };
  return Array.isArray(body.inventory) ? body.inventory : [];
}

/** Hub factory load — Places when configured, mock fallback. */
export async function loadEateryInventoryRows(input: {
  event: EventCandidate;
  lat?: number | null;
  lng?: number | null;
  maxResults?: number;
  radiusM?: number;
  preferUserLocation?: boolean;
}): Promise<LoadedEateryInventory> {
  const radiusM = input.radiusM ?? LODGING_DISCOVERY_RADIUS_M;
  const coords = resolveContextLodgingSearchCoords(input.event, input);
  let rows: ContextEateryInventoryRow[] = [];

  if (coords) {
    if (typeof window !== "undefined") {
      rows = await fetchEateryInventoryFromApi({
        lat: coords.lat,
        lng: coords.lng,
        maxResults: input.maxResults,
        radiusM,
      });
    } else {
      rows = await fetchPlacesEateryNearby({
        lat: coords.lat,
        lng: coords.lng,
        maxResults: input.maxResults,
        radiusM,
      });
    }
  }

  const userLat = input.lat ?? coords?.lat ?? null;
  const userLng = input.lng ?? coords?.lng ?? null;

  if (rows.length > 0) {
    const filtered = filterLodgingRowsWithinRadius({
      rows,
      lat: userLat,
      lng: userLng,
      radiusM,
    });
    return {
      rows: filtered.length > 0 ? filtered : rows,
      source: "google_places",
    };
  }

  if (userLat == null || userLng == null) {
    return { rows: [], source: "mock" };
  }

  const mockRows = resolveEateryMockNearUser({ lat: userLat, lng: userLng });
  const filteredMock = filterLodgingRowsWithinRadius({
    rows: mockRows,
    lat: userLat,
    lng: userLng,
    radiusM: radiusM * 4,
  });

  return {
    rows: filteredMock.length > 0 ? filteredMock : [...mockRows],
    source: "mock",
  };
}
