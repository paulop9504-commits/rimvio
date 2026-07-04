import { buildContextInstance } from "@/lib/context-instance/build-context-instance";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { fetchPlacesLodgingNearby } from "@/lib/globe/context-hub/fetch-places-lodging-nearby";
import { resolveLodgingMockForPlace, resolveLodgingMockNearUser } from "@/lib/globe/context-hub/lodging-mock-inventory";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import { buildLodgingStayWindow } from "@/lib/globe/context-hub/lodging-stay-window";
import { LODGING_DISCOVERY_RADIUS_M } from "@/lib/globe/lodging/lodging-discovery-constants";
import { filterLodgingRowsWithinRadius } from "@/lib/globe/lodging/project-lodging-discovery-session";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

export type LodgingInventorySource = "google_places" | "mock";

export type LoadedLodgingInventory = {
  rows: ContextLodgingInventoryRow[];
  source: LodgingInventorySource;
};

function withStayWindow(
  event: EventCandidate,
  rows: readonly ContextLodgingInventoryRow[],
): ContextLodgingInventoryRow[] {
  const plan = readPlanContextFromEvent(event);
  const checkInIso = plan?.windowStartIso ?? event.datetime ?? null;
  const checkOutIso = plan?.windowEndIso ?? null;
  return rows.map((row) => ({
    ...row,
    checkInIso: row.checkInIso ?? checkInIso,
    checkOutIso: row.checkOutIso ?? checkOutIso,
    stayWindow: buildLodgingStayWindow({ event, row }),
  }));
}

async function fetchLodgingInventoryFromApi(input: {
  lat: number;
  lng: number;
  maxResults?: number;
}): Promise<ContextLodgingInventoryRow[]> {
  const params = new URLSearchParams({
    lat: String(input.lat),
    lng: String(input.lng),
    max: String(input.maxResults ?? 5),
  });
  const response = await fetch(`/api/globe/lodging-inventory?${params.toString()}`);
  if (!response.ok) {
    return [];
  }
  const body = (await response.json()) as {
    inventory?: ContextLodgingInventoryRow[];
  };
  return Array.isArray(body.inventory) ? body.inventory : [];
}

/** Hub factory load — Places API when configured, mock fallback for dev/tests. */
export async function loadLodgingInventoryRows(input: {
  event: EventCandidate;
  lat?: number | null;
  lng?: number | null;
  maxResults?: number;
  preferUserLocation?: boolean;
  radiusM?: number;
}): Promise<LoadedLodgingInventory> {
  const radiusM = input.radiusM ?? LODGING_DISCOVERY_RADIUS_M;
  const context = buildContextInstance({
    event: input.event,
    lat: input.lat,
    lng: input.lng,
    preferUserLocation: input.preferUserLocation,
  });
  const searchOrigin = context.location.searchOrigin;
  let rows: ContextLodgingInventoryRow[] = [];

  if (searchOrigin) {
    if (typeof window !== "undefined") {
      rows = await fetchLodgingInventoryFromApi({
        lat: searchOrigin.lat,
        lng: searchOrigin.lng,
        maxResults: input.maxResults,
      });
    } else {
      rows = await fetchPlacesLodgingNearby({
        lat: searchOrigin.lat,
        lng: searchOrigin.lng,
        maxResults: input.maxResults,
      });
    }
  }

  if (rows.length > 0) {
    const filtered = filterLodgingRowsWithinRadius({
      rows,
      lat: searchOrigin?.lat ?? null,
      lng: searchOrigin?.lng ?? null,
      radiusM,
    });
    return {
      rows: withStayWindow(input.event, filtered.length > 0 ? filtered : rows),
      source: "google_places",
    };
  }

  const place =
    context.location.areaLabel ??
    context.location.anchor.label ??
    input.event.place?.trim() ??
    input.event.title.trim();
  const anchor = searchOrigin ?? { lat: context.location.anchor.lat, lng: context.location.anchor.lng };
  if (!anchor) {
    return { rows: [], source: "mock" };
  }

  const originLat = anchor.lat;
  const originLng = anchor.lng;
  const mockRows =
    input.preferUserLocation && input.lat != null && input.lng != null
      ? resolveLodgingMockNearUser({ lat: originLat, lng: originLng })
      : resolveLodgingMockForPlace(place, anchor);

  const filteredMock = filterLodgingRowsWithinRadius({
    rows: mockRows,
    lat: originLat,
    lng: originLng,
    radiusM: radiusM * 4,
  });

  return {
    rows: withStayWindow(input.event, filteredMock.length > 0 ? filteredMock : [...mockRows]),
    source: "mock",
  };
}
