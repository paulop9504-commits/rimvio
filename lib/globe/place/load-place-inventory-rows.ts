import type { EventCandidate } from "@/lib/events/event-candidate";
import type {
  ContextPlaceInventory,
  ContextPlaceInventoryRow,
} from "@/lib/globe/place/place-resource-types";

export type PlaceInventoryDomain = "activity" | "amenity";

async function fetchPlaceInventoryFromApi(input: {
  domain: PlaceInventoryDomain;
  query: string;
  lat: number;
  lng: number;
  maxResults?: number;
  radiusM?: number;
}): Promise<ContextPlaceInventory> {
  const params = new URLSearchParams({
    domain: input.domain,
    q: input.query,
    lat: String(input.lat),
    lng: String(input.lng),
    max: String(input.maxResults ?? 5),
    radiusM: String(input.radiusM ?? 3000),
  });
  const response = await fetch(`/api/globe/place-inventory?${params.toString()}`);
  if (!response.ok) {
    return { rows: [], source: "google_places" };
  }
  const body = (await response.json()) as {
    inventory?: ContextPlaceInventoryRow[];
    source?: ContextPlaceInventory["source"];
  };
  return {
    rows: Array.isArray(body.inventory) ? body.inventory : [],
    source:
      body.source === "google_places" ||
      body.source === "naver_local" ||
      body.source === "multi_provider" ||
      body.source === "mock"
        ? body.source
        : "google_places",
  };
}

export async function loadPlaceInventoryRows(input: {
  event: EventCandidate;
  domain: PlaceInventoryDomain;
  query: string;
  lat?: number | null;
  lng?: number | null;
  maxResults?: number;
  radiusM?: number;
}): Promise<ContextPlaceInventory> {
  if (
    typeof input.lat !== "number" ||
    typeof input.lng !== "number" ||
    !Number.isFinite(input.lat) ||
    !Number.isFinite(input.lng)
  ) {
    return { rows: [], source: "mock" };
  }

  return fetchPlaceInventoryFromApi({
    domain: input.domain,
    query: input.query,
    lat: input.lat,
    lng: input.lng,
    maxResults: input.maxResults,
    radiusM: input.radiusM,
  });
}
