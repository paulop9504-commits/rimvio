/**
 * Optional live Maps / LiteAPI search — falls back to deterministic runPlaceSearch.
 */

import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import {
  lodgingInventoryHasLivePhotos,
  mergeLodgingInventoryRows,
} from "@/lib/globe/context-hub/merge-lodging-inventory-rows";
import { isLiteApiConfigured } from "@/lib/globe/context-hub/providers/liteapi/liteapi-config";
import { searchLiteApiLodgingNearby } from "@/lib/globe/context-hub/providers/liteapi/search-liteapi-lodging-nearby";
import { fetchPlacesLodgingNearby } from "@/lib/globe/context-hub/fetch-places-lodging-nearby";
import { isGooglePlacesConfigured } from "@/lib/locate/google-places-config";
import { findPlacesByName } from "@/lib/locate/google-places-find";
import type { LocatePlaceResult } from "@/lib/locate/types";
import {
  applyFieldControlToPlaceHits,
  composeSearchQueryWithFieldControl,
} from "@/lib/context-field";
import { mapLodgingInventoryToPlaceHits } from "@/lib/search-engine/map-lodging-inventory-to-hits";
import { mapRestaurantCandidatesToPlaceHits } from "@/lib/search-engine/map-restaurant-candidates-to-hits";
import { searchOsakaDemoCatalog } from "@/lib/search-engine/osaka-demo-catalog";
import {
  fetchPlaceSearchViaApi,
  shouldUsePlaceSearchApiBridge,
} from "@/lib/search-engine/fetch-place-search-via-api";
import { resolvePlaceSearchAnchor } from "@/lib/search-engine/resolve-place-search-anchor";
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

/** Google price_level → band; never invent when missing. */
function priceBandFromLevel(level: number | null | undefined): number | null {
  if (level == null || !Number.isFinite(level)) return null;
  const n = Math.round(level);
  if (n <= 0) return 1;
  if (n >= 4) return 4;
  return n;
}

function locateResultsToHits(
  rows: readonly LocatePlaceResult[],
  domain: PlaceSearchHit["domain"],
  query: string,
): PlaceSearchHit[] {
  return rows.map((row, index) => ({
    id: row.google_place_id
      ? `maps:${row.google_place_id}`
      : `maps:${domain}:${index}`,
    labelKo: row.place_name,
    domain,
    lat: row.lat,
    lng: row.lng,
    rating: row.rating ?? null,
    walkMinutes: null,
    reservable: domain === "lodging",
    localFavorite: /현지|로컬|local/iu.test(query) || index === 0,
    priceBand: priceBandFromLevel(row.priceLevel),
    source: "maps" as const,
    reviewCount: row.reviewCount ?? null,
    priceKrw: null,
    amountLabel: null,
  }));
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
  const maxResults = Math.max(limit, 5);

  let liteRows: ContextLodgingInventoryRow[] = [];
  if (isLiteApiConfigured()) {
    try {
      const guestCount =
        typeof input.guestCount === "number" &&
        Number.isFinite(input.guestCount) &&
        input.guestCount > 0
          ? Math.round(input.guestCount)
          : 2;
      liteRows = [
        ...(await searchLiteApiLodgingNearby({
          lat,
          lng,
          maxResults,
          guestCount,
          checkInIso: input.checkInIso,
          checkOutIso: input.checkOutIso,
        })),
      ];
    } catch {
      liteRows = [];
    }
  }

  let placesRows: ContextLodgingInventoryRow[] = [];
  const needsPlaces =
    liteRows.length === 0 || !lodgingInventoryHasLivePhotos(liteRows);
  if (isGooglePlacesConfigured() && needsPlaces) {
    try {
      placesRows = [
        ...(await fetchPlacesLodgingNearby({
          lat,
          lng,
          maxResults,
          keyword: input.query?.trim() || null,
        })),
      ];
    } catch {
      placesRows = [];
    }
  }

  const rows =
    liteRows.length > 0 && placesRows.length > 0
      ? mergeLodgingInventoryRows({
          primary: liteRows,
          secondary: placesRows,
          maxResults,
        })
      : liteRows.length > 0
        ? liteRows
        : placesRows;

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

  if (isGooglePlacesConfigured()) {
    try {
      const found = await findPlacesByName({
        placeName: mapsTextQuery(input),
        userLat: lat,
        userLng: lng,
        maxResults: limit,
      });
      if (found.length > 0) {
        return locateResultsToHits(found.slice(0, limit), "lodging", input.query);
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
    return locateResultsToHits(
      found.slice(0, limit),
      input.domain,
      input.query,
    );
  } catch {
    return null;
  }
}

/**
 * Prefer LiteAPI (lodging) / Google Places + Naver (eatery) when configured.
 * Seed orbit (리버뷰 호텔 …) is never used unless Osaka demo forced or allowSeedFallback.
 * Browser always goes through `/api/search/places` (server-only API keys).
 */
export async function runPlaceSearchAsync(
  input: PlaceSearchInput,
): Promise<readonly PlaceSearchHit[]> {
  const resolvedAnchor = resolvePlaceSearchAnchor({
    anchorLat: input.anchorLat,
    anchorLng: input.anchorLng,
    contextEventId: input.contextEventId,
    query: input.query,
    contextLabelKo: input.contextLabelKo,
  });
  const anchored: PlaceSearchInput = {
    ...input,
    anchorLat: resolvedAnchor?.lat ?? input.anchorLat,
    anchorLng: resolvedAnchor?.lng ?? input.anchorLng,
  };

  if (shouldUsePlaceSearchApiBridge()) {
    return fetchPlaceSearchViaApi(anchored);
  }

  const limit = anchored.limit ?? 4;
  const fieldSearch = anchored.fieldSearch ?? null;
  const composed: PlaceSearchInput = {
    ...anchored,
    query: fieldSearch
      ? composeSearchQueryWithFieldControl(anchored.query, fieldSearch)
      : anchored.query,
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

  const allowSeed =
    input.allowSeedFallback === true || isOsakaDemoCatalogForced();

  if (!hits || hits.length === 0) {
    if (allowSeed) {
      hits = runPlaceSearch({
        ...anchored,
        query: composed.query,
        limit: composed.limit,
        fieldSearch: null,
        skipOsakaCatalog:
          liveProvidersReady() && !isOsakaDemoCatalogForced()
            ? true
            : input.skipOsakaCatalog,
      });
    } else {
      // Live-only: empty beats fake Riverview / orbit seeds on every city.
      hits = [];
    }
  }

  const controlled = fieldSearch
    ? applyFieldControlToPlaceHits(hits, fieldSearch)
    : [...hits];
  // Soft budget must not empty Diff — consensus ranks 가성비 instead.
  const kept = controlled.length > 0 ? controlled : [...hits];
  return rankByValueConsensus(kept).slice(0, limit);
}
