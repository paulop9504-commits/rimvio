import { buildContextInstance } from "@/lib/context-instance/build-context-instance";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  serializeCanonicalPlaceProfile,
} from "@/lib/globe/canonical-place-profile";
import { resolveEateryMockNearUser } from "@/lib/globe/eatery/eatery-mock-inventory";
import type { ContextEateryInventoryRow } from "@/lib/globe/eatery/eatery-resource-types";
import { filterLodgingRowsWithinRadius } from "@/lib/globe/lodging/project-lodging-discovery-session";
import { LODGING_DISCOVERY_RADIUS_M } from "@/lib/globe/lodging/lodging-discovery-constants";

export type EateryInventorySource =
  | "google_places"
  | "naver_local"
  | "multi_provider"
  | "mock";

export type LoadedEateryInventory = {
  rows: ContextEateryInventoryRow[];
  source: EateryInventorySource;
};

function buildFallbackEateryQuery(input: {
  anchorLabel: string | null;
  eventTitle: string;
  mealMoment: "breakfast" | "brunch" | "lunch" | "dinner" | "late_night" | null;
}): string {
  const area = input.anchorLabel?.trim() || input.eventTitle.trim() || "근처";
  const meal =
    input.mealMoment === "late_night"
      ? "야식"
      : input.mealMoment === "dinner"
        ? "저녁"
        : input.mealMoment === "lunch"
          ? "점심"
          : input.mealMoment === "brunch"
            ? "브런치"
            : input.mealMoment === "breakfast"
              ? "아침"
              : null;
  return `${area} ${meal ? `${meal} ` : ""}맛집`.trim();
}

async function fetchEateryInventoryFromApi(input: {
  query: string;
  anchorLabel?: string | null;
  placeProfile?: string | null;
  lat: number;
  lng: number;
  maxResults?: number;
  radiusM?: number;
}): Promise<LoadedEateryInventory> {
  const params = new URLSearchParams({
    q: input.query,
    lat: String(input.lat),
    lng: String(input.lng),
    max: String(input.maxResults ?? 5),
    radiusM: String(input.radiusM ?? LODGING_DISCOVERY_RADIUS_M),
  });
  if (input.anchorLabel?.trim()) {
    params.set("anchor", input.anchorLabel.trim());
  }
  if (input.placeProfile?.trim()) {
    params.set("placeProfile", input.placeProfile.trim());
  }
  const response = await fetch(`/api/globe/eatery-inventory?${params.toString()}`);
  if (!response.ok) {
    return { rows: [], source: "mock" };
  }
  const body = (await response.json()) as {
    inventory?: ContextEateryInventoryRow[];
    source?: EateryInventorySource;
  };
  return {
    rows: Array.isArray(body.inventory) ? body.inventory : [],
    source:
      body.source === "google_places" ||
      body.source === "naver_local" ||
      body.source === "multi_provider" ||
      body.source === "mock"
        ? body.source
        : "mock",
  };
}

/** Hub factory load — Places when configured, mock fallback. */
export async function loadEateryInventoryRows(input: {
  event: EventCandidate;
  message?: string;
  lat?: number | null;
  lng?: number | null;
  maxResults?: number;
  radiusM?: number;
  preferUserLocation?: boolean;
}): Promise<LoadedEateryInventory> {
  const radiusM = input.radiusM ?? LODGING_DISCOVERY_RADIUS_M;
  const context = buildContextInstance({
    event: input.event,
    message: input.message,
    lat: input.lat,
    lng: input.lng,
    preferUserLocation: input.preferUserLocation,
  });
  const searchOrigin = context.location.searchOrigin;
  const placeProfile = context.location.anchor.profile;
  const serializedProfile = serializeCanonicalPlaceProfile(placeProfile);
  let rows: ContextEateryInventoryRow[] = [];
  let source: EateryInventorySource = "mock";
  const anchorLabel =
    context.location.areaLabel ||
    placeProfile.label?.trim() ||
    input.event.place?.trim() ||
    input.event.title.trim() ||
    null;
  const query =
    input.message?.trim() ||
    buildFallbackEateryQuery({
      anchorLabel,
      eventTitle: input.event.title,
      mealMoment: context.title.searchBias.mealMoment,
    });

  if (searchOrigin) {
    if (typeof window !== "undefined") {
      const loaded = await fetchEateryInventoryFromApi({
        query,
        anchorLabel,
        placeProfile: serializedProfile,
        lat: searchOrigin.lat,
        lng: searchOrigin.lng,
        maxResults: input.maxResults,
        radiusM,
      });
      rows = loaded.rows;
      source = loaded.source;
    } else {
      const { searchRestaurants } = await import("@/lib/restaurant-search");
      const loaded = await searchRestaurants({
        query,
        anchorLabel,
        placeProfile,
        origin: { lat: searchOrigin.lat, lng: searchOrigin.lng },
        maxResults: input.maxResults,
        radiusM,
      });
      rows = loaded.candidates.map((candidate) => ({
        placeId: candidate.placeId,
        name: candidate.name,
        lat: candidate.lat,
        lng: candidate.lng,
        images: [...candidate.images],
        address: candidate.address ?? null,
        cuisineHint: candidate.cuisineHint ?? null,
        priceLevel: candidate.priceLevel ?? null,
        rating: candidate.rating ?? null,
        openNow: candidate.openNow ?? null,
        mapsUrl: candidate.mapsUrl ?? null,
        provider: candidate.source,
        providerLabel: candidate.sourceLabel,
        categoryLabel: candidate.categoryLabel ?? null,
        specialReasonKo: candidate.specialReasonKo ?? null,
        specialScore: candidate.specialScore ?? null,
        searchScore: candidate.searchScore ?? null,
        virtualCandidate: true,
      }));
      source =
        Object.keys(loaded.providerBreakdown).length > 1
          ? "multi_provider"
          : rows[0]?.provider === "naver_local"
            ? "naver_local"
            : rows[0]?.provider === "google_places"
              ? "google_places"
              : "mock";
    }
  }

  const originLat = searchOrigin?.lat ?? null;
  const originLng = searchOrigin?.lng ?? null;

  if (rows.length > 0 && originLat != null && originLng != null) {
    const filtered = filterLodgingRowsWithinRadius({
      rows,
      lat: originLat,
      lng: originLng,
      radiusM,
    });
    if (filtered.length > 0) {
      return {
        rows: filtered,
        source,
      };
    }
  } else if (rows.length > 0 && (originLat == null || originLng == null)) {
    return { rows, source };
  }

  if (originLat == null || originLng == null) {
    return { rows: [], source: "mock" };
  }

  const mockRows = resolveEateryMockNearUser({ lat: originLat, lng: originLng });
  const filteredMock = filterLodgingRowsWithinRadius({
    rows: mockRows,
    lat: originLat,
    lng: originLng,
    radiusM: radiusM * 4,
  });

  return {
    rows: filteredMock.length > 0 ? filteredMock : [...mockRows],
    source: "mock",
  };
}
