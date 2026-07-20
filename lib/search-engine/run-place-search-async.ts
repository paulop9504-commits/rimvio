/**
 * Optional live Maps / LiteAPI search — falls back to deterministic runPlaceSearch.
 */

import { isLiteApiConfigured } from "@/lib/globe/context-hub/providers/liteapi/liteapi-config";
import { searchLiteApiLodgingNearby } from "@/lib/globe/context-hub/providers/liteapi/search-liteapi-lodging-nearby";
import { fetchPlacesLodgingNearby } from "@/lib/globe/context-hub/fetch-places-lodging-nearby";
import { isGooglePlacesConfigured } from "@/lib/locate/google-places-config";
import { findPlacesByName } from "@/lib/locate/google-places-find";
import {
  applyFieldControlToPlaceHits,
  composeSearchQueryWithFieldControl,
} from "@/lib/context-field";
import { mapLodgingInventoryToPlaceHits } from "@/lib/search-engine/map-lodging-inventory-to-hits";
import { mapRestaurantCandidatesToPlaceHits } from "@/lib/search-engine/map-restaurant-candidates-to-hits";
import { searchOsakaDemoCatalog } from "@/lib/search-engine/osaka-demo-catalog";
import {
  runPlaceSearch,
  type PlaceSearchHit,
  type PlaceSearchInput,
} from "@/lib/search-engine/run-place-search";
import { searchRestaurants } from "@/lib/restaurant-search/search-restaurants";
import { rankByValueConsensus } from "@/lib/search-engine/score-value-consensus";

/** Force Osaka catalog even when live keys exist (30s demo / tests). */
export function isOsakaDemoCatalogForced(): boolean {
  return process.env.RIMVIO_OSAKA_DEMO?.trim() === "1";
}

function liveProvidersReady(): boolean {
  return isGooglePlacesConfigured() || isLiteApiConfigured();
}

function mapsTextQuery(input: PlaceSearchInput): string {
  const q = input.query.trim();
  if (input.domain === "lodging" && /apa|아파/iu.test(q)) {
    return "APA Hotel Osaka Namba";
  }
  return q.slice(0, 80);
}

async function liveEateryHits(
  input: PlaceSearchInput,
): Promise<readonly PlaceSearchHit[] | null> {
  const lat = input.anchorLat;
  const lng = input.anchorLng;
  if (lat == null || lng == null || !isGooglePlacesConfigured()) {
    return null;
  }

  const limit = input.limit ?? 4;
  const result = await searchRestaurants({
    query: input.query,
    origin: { lat, lng },
    maxResults: limit,
    radiusM: 1_200,
  });
  if (result.candidates.length === 0) {
    return null;
  }
  return mapRestaurantCandidatesToPlaceHits({
    candidates: result.candidates,
    query: input.query,
    anchorLat: lat,
    anchorLng: lng,
    localityMode: result.intent.localityMode,
  }).slice(0, limit);
}

async function liveLodgingHits(
  input: PlaceSearchInput,
): Promise<readonly PlaceSearchHit[] | null> {
  const lat = input.anchorLat;
  const lng = input.anchorLng;
  if (lat == null || lng == null) {
    return null;
  }
  const limit = input.limit ?? 4;

  if (isLiteApiConfigured()) {
    try {
      const guestCount =
        typeof input.guestCount === "number" &&
        Number.isFinite(input.guestCount) &&
        input.guestCount > 0
          ? Math.round(input.guestCount)
          : 2;
      const rows = await searchLiteApiLodgingNearby({
        lat,
        lng,
        maxResults: Math.max(limit, 5),
        guestCount,
        checkInIso: input.checkInIso,
        checkOutIso: input.checkOutIso,
      });
      if (rows.length > 0) {
        const hits = mapLodgingInventoryToPlaceHits({
          rows,
          query: input.query,
          anchorLat: lat,
          anchorLng: lng,
          limit,
        });
        if (hits.length > 0) {
          return hits;
        }
      }
    } catch {
      // fall through to Google Places
    }
  }

  if (isGooglePlacesConfigured()) {
    try {
      const rows = await fetchPlacesLodgingNearby({
        lat,
        lng,
        maxResults: limit,
      });
      if (rows.length > 0) {
        return mapLodgingInventoryToPlaceHits({
          rows,
          query: input.query,
          anchorLat: lat,
          anchorLng: lng,
          limit,
        });
      }
    } catch {
      // fall through
    }

    try {
      const found = await findPlacesByName({
        placeName: mapsTextQuery(input),
        userLat: lat,
        userLng: lng,
        maxResults: limit,
      });
      if (found.length > 0) {
        return found.slice(0, limit).map((row, index) => ({
          id: row.google_place_id
            ? `maps:${row.google_place_id}`
            : `maps:lodging:${index}`,
          labelKo: row.place_name,
          domain: "lodging" as const,
          lat: row.lat,
          lng: row.lng,
          rating: null,
          walkMinutes: 5 + index * 2,
          reservable: true,
          localFavorite: false,
          priceBand: 2,
          source: "maps" as const,
        }));
      }
    } catch {
      // fall through
    }
  }

  return null;
}

async function livePoiHits(
  input: PlaceSearchInput,
): Promise<readonly PlaceSearchHit[] | null> {
  if (!isGooglePlacesConfigured()) {
    return null;
  }
  const limit = input.limit ?? 4;
  try {
    const found = await findPlacesByName({
      placeName: mapsTextQuery(input),
      userLat: input.anchorLat,
      userLng: input.anchorLng,
      maxResults: limit,
    });
    if (found.length === 0) {
      return null;
    }
    return found.slice(0, limit).map((row, index) => ({
      id: row.google_place_id
        ? `maps:${row.google_place_id}`
        : `maps:${input.domain}:${index}`,
      labelKo: row.place_name,
      domain: input.domain,
      lat: row.lat,
      lng: row.lng,
      rating: null,
      walkMinutes: 5 + index * 2,
      reservable: index % 2 === 0,
      localFavorite: /현지|로컬|local/iu.test(input.query) || index === 0,
      priceBand: 1 + (index % 3),
      source: "maps" as const,
    }));
  } catch {
    return null;
  }
}

/**
 * Prefer LiteAPI (lodging) / Google Places + Naver (eatery) when configured.
 * Osaka catalog only when forced or no live providers.
 */
export async function runPlaceSearchAsync(
  input: PlaceSearchInput,
): Promise<readonly PlaceSearchHit[]> {
  const limit = input.limit ?? 4;
  const fieldSearch = input.fieldSearch ?? null;
  const composed: PlaceSearchInput = {
    ...input,
    query: fieldSearch
      ? composeSearchQueryWithFieldControl(input.query, fieldSearch)
      : input.query,
    // Avoid double-apply inside sync fallback; we apply once at the end.
    fieldSearch: null,
    limit: Math.max(limit, fieldSearch ? 8 : limit),
  };

  let hits: readonly PlaceSearchHit[] | null = null;

  if (composed.domain === "eatery") {
    hits = await liveEateryHits(composed);
  } else if (composed.domain === "lodging") {
    hits = await liveLodgingHits(composed);
  } else if (composed.domain === "poi") {
    hits = await livePoiHits(composed);
  }

  if (
    (!hits || hits.length === 0) &&
    composed.domain !== "poi" &&
    isGooglePlacesConfigured() &&
    composed.query.trim().length >= 2
  ) {
    const named = await livePoiHits({ ...composed, domain: composed.domain });
    if (named?.length) {
      hits = named.map((hit) => ({ ...hit, domain: composed.domain }));
    }
  }

  if (!hits || hits.length === 0) {
    hits = runPlaceSearch({
      ...input,
      query: composed.query,
      limit: composed.limit,
      fieldSearch: null,
      skipOsakaCatalog:
        liveProvidersReady() && !isOsakaDemoCatalogForced()
          ? true
          : input.skipOsakaCatalog,
    });
  }

  const controlled = fieldSearch
    ? applyFieldControlToPlaceHits(hits, fieldSearch)
    : [...hits];
  // Soft budget must not empty Diff — consensus ranks 가성비 instead.
  const kept = controlled.length > 0 ? controlled : [...hits];
  return rankByValueConsensus(kept).slice(0, limit);
}
