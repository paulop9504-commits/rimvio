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
import { amountLabelFromPriceLevel } from "@/lib/search-engine/amount-label-from-price-level";
import {
  filterLodgingRowsForIntent,
  lodgingRowLooksLuxury,
  parseMaxNightlyPriceKrw,
} from "@/lib/globe/context-condition-ai/filter-lodging-for-intent";
import {
  parseLodgingStayTypeFromText,
  resolveLodgingStaySearchKeyword,
  lodgingRowMatchesStayType,
  type LodgingStayType,
} from "@/lib/globe/lodging/lodging-stay-types";
import { resolveLodgingMockForPlace } from "@/lib/globe/context-hub/lodging-mock-inventory";
import {
  applyFieldControlToPlaceHits,
  composeSearchQueryWithFieldControl,
} from "@/lib/context-field";
import { mapLodgingInventoryToPlaceHits } from "@/lib/search-engine/map-lodging-inventory-to-hits";
import { mapRestaurantCandidatesToPlaceHits } from "@/lib/search-engine/map-restaurant-candidates-to-hits";
import {
  looksLikeOsakaContext,
  searchOsakaDemoCatalog,
} from "@/lib/search-engine/osaka-demo-catalog";
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
  const place =
    input.contextLabelKo?.trim().replace(/\s*여행$/u, "").trim() || null;
  // Bare “놀거리 찾아” → Places textSearch needs a real place + attraction cue.
  if (
    input.domain === "poi" &&
    /놀거리|볼거리|할거리|관광|명소|액티비티|things?\s*to\s*do|attraction/iu.test(
      q,
    )
  ) {
    const cleaned = q
      .replace(
        /(?:찾아|보여|알려|추천)(?:\s*(?:줘|요|주세요|봐))?/giu,
        "",
      )
      .replace(/놀거리|볼거리|할거리/giu, "tourist attractions")
      .trim();
    const base = cleaned || "tourist attractions";
    return (place ? `${place} ${base}` : base).slice(0, 80);
  }
  if (
    input.domain === "eatery" &&
    /^(?:맛집|식당|카페)?\s*(?:찾아|보여|알려|추천)?(?:\s*(?:줘|요|주세요))?$/iu.test(
      q,
    )
  ) {
    return (place ? `${place} restaurants` : "restaurants").slice(0, 80);
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
  return rows.map((row, index) => {
    const amountLabel = amountLabelFromPriceLevel(row.priceLevel);
    const thumb = row.thumbnailUrl?.trim() || null;
    return {
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
      amountLabel,
      thumbnailUrl: thumb,
      images: thumb ? [thumb] : null,
    };
  });
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
  const anchorLabel = input.contextLabelKo?.trim() || null;
  const result = await searchRestaurants({
    query: input.query,
    origin: { lat, lng },
    maxResults: limit,
    radiusM: looksLikeOsakaContext({
      query: `${input.query} ${anchorLabel ?? ""}`,
      anchorLat: lat,
      anchorLng: lng,
    })
      ? 2_400
      : 1_200,
    anchorLabel,
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

function lodgingStayNeedsPlacesFirst(stay: LodgingStayType | null): boolean {
  if (!stay) return false;
  return (
    stay === "capsule" ||
    stay === "hostel" ||
    stay === "guesthouse" ||
    stay === "dormitory" ||
    stay === "motel" ||
    stay === "ryokan" ||
    stay === "hanok" ||
    stay === "machiya" ||
    stay === "temple_stay" ||
    stay === "pension" ||
    stay === "glamping" ||
    stay === "campsite" ||
    stay === "homestay" ||
    stay === "bnb" ||
    stay === "airbnb"
  );
}

function diversifyLodgingRows(
  rows: readonly ContextLodgingInventoryRow[],
  limit: number,
): ContextLodgingInventoryRow[] {
  const out: ContextLodgingInventoryRow[] = [];
  const brandSeen = new Set<string>();
  const brandKey = (name: string) => {
    const n = name.toLowerCase();
    if (/hilton|hilton|힐튼/iu.test(n)) return "hilton";
    if (/conrad|콘래드/iu.test(n)) return "conrad";
    if (/marriott|메리어트|sheraton|쉐라톤/iu.test(n)) return "marriott";
    if (/hyatt|하얏트/iu.test(n)) return "hyatt";
    if (/intercontinental|ihg/iu.test(n)) return "ihg";
    if (/apa|아파/iu.test(n)) return "apa";
    return n.slice(0, 12);
  };
  // Prefer non-luxury first when mixed inventory.
  const ordered = [...rows].sort((a, b) => {
    const aLux = lodgingRowLooksLuxury(a) ? 1 : 0;
    const bLux = lodgingRowLooksLuxury(b) ? 1 : 0;
    if (aLux !== bLux) return aLux - bLux;
    const ap = a.priceKrw ?? Number.POSITIVE_INFINITY;
    const bp = b.priceKrw ?? Number.POSITIVE_INFINITY;
    return ap - bp;
  });
  for (const row of ordered) {
    const key = brandKey(row.name);
    if (brandSeen.has(key) && out.length >= Math.min(3, limit)) {
      continue;
    }
    brandSeen.add(key);
    out.push(row);
    if (out.length >= limit) break;
  }
  if (out.length < limit) {
    for (const row of ordered) {
      if (out.some((r) => r.placeId === row.placeId)) continue;
      out.push(row);
      if (out.length >= limit) break;
    }
  }
  return out;
}

async function liveLodgingHits(
  input: PlaceSearchInput,
): Promise<readonly PlaceSearchHit[] | null> {
  const lat = input.anchorLat;
  const lng = input.anchorLng;
  if (lat == null || lng == null) {
    return null;
  }
  const limit = Math.max(input.limit ?? 4, 8);
  const maxResults = Math.max(limit, 12);
  const stayType = parseLodgingStayTypeFromText(
    `${input.query} ${input.contextLabelKo ?? ""}`,
  );
  const stayFirst = lodgingStayNeedsPlacesFirst(stayType);
  const areaHint =
    input.contextLabelKo?.trim().replace(/\s*여행.*/u, "").trim() || null;
  const keyword =
    resolveLodgingStaySearchKeyword({
      stayType,
      message: input.query,
      areaHint,
    }) ??
    input.query?.trim() ??
    null;
  const priceCap = parseMaxNightlyPriceKrw(input.query ?? "");

  let liteRows: ContextLodgingInventoryRow[] = [];
  // Capsule/hostel/etc: Places keyword first — LiteAPI radius rates skew luxury.
  if (isLiteApiConfigured() && !stayFirst) {
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
    stayFirst ||
    liteRows.length === 0 ||
    !lodgingInventoryHasLivePhotos(liteRows) ||
    Boolean(keyword && stayType);
  if (isGooglePlacesConfigured() && needsPlaces) {
    try {
      placesRows = [
        ...(await fetchPlacesLodgingNearby({
          lat,
          lng,
          maxResults,
          keyword: keyword || input.query?.trim() || null,
        })),
      ];
    } catch {
      placesRows = [];
    }
  }

  let rows: ContextLodgingInventoryRow[] =
    stayFirst && placesRows.length > 0
      ? placesRows
      : liteRows.length > 0 && placesRows.length > 0
        ? mergeLodgingInventoryRows({
            primary: stayFirst ? placesRows : liteRows,
            secondary: stayFirst ? liteRows : placesRows,
            maxResults,
          })
        : liteRows.length > 0
          ? liteRows
          : placesRows;

  if (stayType || priceCap != null) {
    rows = filterLodgingRowsForIntent({
      rows,
      lodgingKind:
        stayType === "capsule" ||
        stayType === "hostel" ||
        stayType === "guesthouse" ||
        stayType === "dormitory"
          ? "hostel"
          : "hotel",
      budget:
        priceCap != null && priceCap <= 80_000
          ? "low"
          : priceCap != null && priceCap <= 150_000
            ? "medium"
            : "high",
      maxNightlyPriceKrw: priceCap,
      lodgingStayType: stayType,
    });
  }

  rows = diversifyLodgingRows(rows, maxResults);

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
        placeName: mapsTextQuery({
          ...input,
          query: keyword || input.query,
        }),
        userLat: lat,
        userLng: lng,
        maxResults: limit,
      });
      if (found.length > 0) {
        return locateResultsToHits(
          found.slice(0, limit),
          "lodging",
          input.query,
        );
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
    composed.domain !== "lodging" &&
    isGooglePlacesConfigured() &&
    composed.query.trim().length >= 2
  ) {
    const named = await livePoiHits({ ...composed, domain: composed.domain });
    if (named?.length) {
      hits = named.map((hit) => ({ ...hit, domain: composed.domain }));
    }
  }

  // Lodging stay soft inventory — live miss must not leave Workspace empty
  // (capsule seed was previously blocked by Osaka demo APA guard).
  if ((!hits || hits.length === 0) && composed.domain === "lodging") {
    const stay = parseLodgingStayTypeFromText(composed.query);
    const softStay =
      stay === "capsule" ||
      stay === "hostel" ||
      stay === "guesthouse" ||
      stay === "ryokan" ||
      /캡슐|capsule|호스텔|게스트|료칸/iu.test(composed.query);
    if (softStay) {
      const lat = composed.anchorLat ?? 34.6654;
      const lng = composed.anchorLng ?? 135.5019;
      const placeLabel =
        input.contextLabelKo?.trim() ||
        composed.query.replace(/찾아.?줘|검색|보여.?줘/giu, "").trim() ||
        "오사카";
      const mock = resolveLodgingMockForPlace(placeLabel, { lat, lng });
      const filtered = stay
        ? mock.filter((row) => lodgingRowMatchesStayType(row, stay))
        : mock.filter((row) =>
            /캡슐|capsule|호스텔|게스트|료칸|hostel|guest/iu.test(row.name),
          );
      const rows = filtered.length > 0 ? filtered : mock;
      if (rows.length > 0) {
        hits = mapLodgingInventoryToPlaceHits({
          rows,
          query: composed.query,
          anchorLat: lat,
          anchorLng: lng,
          limit: composed.limit ?? 6,
        }).map((h) => ({ ...h, source: "seed" as const, domain: "lodging" }));
      }
    }
  }

  const allowSeed =
    input.allowSeedFallback === true || isOsakaDemoCatalogForced();

  if (!hits || hits.length === 0) {
    const osakaCtx = looksLikeOsakaContext({
      query: `${composed.query} ${input.contextLabelKo ?? ""}`,
      anchorLat: composed.anchorLat,
      anchorLng: composed.anchorLng,
    });
    // Osaka soft catalog when live Maps empty — eatery + poi/놀거리 (not fake lodging).
    if (
      osakaCtx &&
      (composed.domain === "eatery" ||
        composed.domain === "poi" ||
        allowSeed)
    ) {
      const catalog = searchOsakaDemoCatalog({
        query: composed.query,
        domain: composed.domain,
        limit: composed.limit,
        anchorLat: composed.anchorLat,
        anchorLng: composed.anchorLng,
      });
      if (catalog?.length) {
        hits = catalog;
      }
    }
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
  }

  const controlled = fieldSearch
    ? applyFieldControlToPlaceHits(hits, fieldSearch)
    : [...hits];
  // Soft budget must not empty Diff — consensus ranks 가성비 instead.
  const kept = controlled.length > 0 ? controlled : [...hits];
  return rankByValueConsensus(kept).slice(0, limit);
}
