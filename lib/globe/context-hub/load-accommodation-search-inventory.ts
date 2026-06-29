import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import { LODGING_DISCOVERY_RADIUS_M } from "@/lib/globe/lodging/lodging-discovery-constants";
import { filterLodgingRowsWithinRadius } from "@/lib/globe/lodging/project-lodging-discovery-session";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

export type AccommodationInventorySource = "google_places" | "mock";

export type LoadedAccommodationInventory = {
  rows: ContextLodgingInventoryRow[];
  source: AccommodationInventorySource;
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
  }));
}

async function fetchAccommodationInventoryFromApi(input: {
  lat: number;
  lng: number;
  maxResults?: number;
}): Promise<{ rows: ContextLodgingInventoryRow[]; source: AccommodationInventorySource }> {
  const params = new URLSearchParams({
    lat: String(input.lat),
    lng: String(input.lng),
    max: String(input.maxResults ?? 5),
  });
  const response = await fetch(`/api/globe/market-price?${params.toString()}`);
  if (!response.ok) {
    return { rows: [], source: "mock" };
  }
  const body = (await response.json()) as {
    inventory?: ContextLodgingInventoryRow[];
    source?: AccommodationInventorySource;
  };
  return {
    rows: Array.isArray(body.inventory) ? body.inventory : [],
    source: body.source === "google_places" ? "google_places" : "mock",
  };
}

/** Hub Rail factory — Capacitor GPS → /api/globe/market-price + Places. */
export async function loadAccommodationSearchInventory(input: {
  event: EventCandidate;
  lat: number;
  lng: number;
  maxResults?: number;
  radiusM?: number;
}): Promise<LoadedAccommodationInventory> {
  const radiusM = input.radiusM ?? LODGING_DISCOVERY_RADIUS_M;
  const loaded = await fetchAccommodationInventoryFromApi({
    lat: input.lat,
    lng: input.lng,
    maxResults: input.maxResults,
  });

  const filtered = filterLodgingRowsWithinRadius({
    rows: loaded.rows,
    lat: input.lat,
    lng: input.lng,
    radiusM,
  });

  const rows = withStayWindow(input.event, filtered.length > 0 ? filtered : loaded.rows);
  return {
    rows,
    source: loaded.source,
  };
}
