/**
 * Search Engine — place inventory fetch for Graph/Tool use only.
 * Does not open feeds or Commit. Osaka catalog first; Maps adapter optional.
 */

import type { GraphEntityDomain } from "@/lib/graph-command/types";
import {
  applyFieldControlToPlaceHits,
  composeSearchQueryWithFieldControl,
  type ContextFieldSearchControl,
} from "@/lib/context-field";
import { searchOsakaDemoCatalog } from "@/lib/search-engine/osaka-demo-catalog";
import { rankByValueConsensus } from "@/lib/search-engine/score-value-consensus";

export type PlaceSearchHit = {
  readonly id: string;
  readonly labelKo: string;
  readonly domain: GraphEntityDomain;
  readonly lat: number;
  readonly lng: number;
  readonly rating: number | null;
  readonly walkMinutes: number | null;
  readonly reservable: boolean;
  /** “현지인” / local favorite signal for filter + ranking. */
  readonly localFavorite: boolean;
  readonly priceBand: number | null;
  readonly source: "seed" | "maps" | "review" | "booking" | "liteapi";
  /** LiteAPI offer id when source is live lodging rates. */
  readonly liteapiOfferId?: string | null;
  readonly liteapiHotelId?: string | null;
  readonly amountLabel?: string | null;
  /** Review volume when known (Maps / seed). */
  readonly reviewCount?: number | null;
  /** Absolute price KRW when known (LiteAPI). */
  readonly priceKrw?: number | null;
  /** Scout / inventory — why this place (photo spot etc.). */
  readonly reasonKo?: string | null;
  readonly thumbnailUrl?: string | null;
  /** Extra photos when inventory provides a gallery. */
  readonly images?: readonly string[] | null;
  readonly activitySubtype?: string | null;
};

export type PlaceSearchInput = {
  readonly query: string;
  readonly domain: GraphEntityDomain;
  readonly anchorLat?: number | null;
  readonly anchorLng?: number | null;
  readonly labels?: readonly string[];
  readonly limit?: number;
  /** Skip Osaka demo catalog (used when live APIs miss but keys are present). */
  readonly skipOsakaCatalog?: boolean;
  /**
   * When false (default for async), never invent Riverview/orbit seeds.
   * Sync `runPlaceSearch` and `RIMVIO_OSAKA_DEMO=1` still use deterministic seeds.
   */
  readonly allowSeedFallback?: boolean;
  /** Context Field search control — same pack that drives graph/recommend/booking. */
  readonly fieldSearch?: ContextFieldSearchControl | null;
  /** Open lodging Diff stay — LiteAPI occupancy / dates. */
  readonly checkInIso?: string | null;
  readonly checkOutIso?: string | null;
  readonly guestCount?: number | null;
  /** Open Context — resolve destination coords when lat/lng missing. */
  readonly contextEventId?: string | null;
  readonly contextLabelKo?: string | null;
};

function orbit(
  lat: number,
  lng: number,
  index: number,
): { lat: number; lng: number } {
  const angle = 40 + index * 50;
  const rad = (angle * Math.PI) / 180;
  const r = 0.32 + index * 0.07;
  const latOffset = (r / 111) * Math.cos(rad);
  const lngOffset =
    (r / (111 * Math.max(0.25, Math.cos((lat * Math.PI) / 180)))) * Math.sin(rad);
  return { lat: lat + latOffset, lng: lng + lngOffset };
}

function seedLabels(
  domain: GraphEntityDomain,
  query: string,
  labels?: readonly string[],
): string[] {
  if (labels?.length) {
    return [...labels];
  }
  if (domain === "lodging") {
    if (/APA|아파/iu.test(query)) {
      return ["APA 난바", "APA 우메다", "APA 교토"];
    }
    return ["리버뷰 호텔", "스테이 인", "시티 로지"];
  }
  if (domain === "eatery") {
    if (/동태|생태|찌개/iu.test(query)) {
      return ["시골집생태전문", "원조옥이양푼이동태찌개", "생태명가"];
    }
    if (/고기|현지/iu.test(query)) {
      return ["골목 고깃집", "현지 맛집", "야키니쿠 집"];
    }
    return ["근처 카페", "골목 맛집", "로컬 식당"];
  }
  if (/약국|pharmacy/iu.test(query)) {
    return ["가까운 약국", "24시 약국", "역앞 약국"];
  }
  if (/편의점|convenience/iu.test(query)) {
    return ["세븐일레븐", "로손", "패밀리마트"];
  }
  if (/atm|은행|병원|마트/iu.test(query)) {
    return ["편의 ATM", "동네 병원", "미니 마트"];
  }
  return ["포토스팟", "산책로", "전망대"];
}

function seedLocalFavorite(label: string, index: number, query: string): boolean {
  if (/현지|로컬|골목/iu.test(label) || /현지|로컬/iu.test(query)) {
    return true;
  }
  return index === 1;
}

/**
 * Deterministic place search. Osaka demo catalog when context matches;
 * otherwise seed orbit. Maps live path: runPlaceSearchAsync.
 */
export function runPlaceSearch(input: PlaceSearchInput): readonly PlaceSearchHit[] {
  const limit = input.limit ?? 4;
  const query = input.fieldSearch
    ? composeSearchQueryWithFieldControl(input.query, input.fieldSearch)
    : input.query;
  if (!input.skipOsakaCatalog) {
    const catalog = searchOsakaDemoCatalog({
      query,
      domain: input.domain,
      limit: Math.max(limit, 6),
      anchorLat: input.anchorLat,
      anchorLng: input.anchorLng,
    });
    if (catalog?.length) {
      const controlled = input.fieldSearch
        ? applyFieldControlToPlaceHits(catalog, input.fieldSearch)
        : [...catalog];
      const kept = controlled.length > 0 ? controlled : [...catalog];
      return rankByValueConsensus(kept).slice(0, limit);
    }
  }

  const baseLat = input.anchorLat ?? 36.3621;
  const baseLng = input.anchorLng ?? 127.3446;
  const labels = seedLabels(input.domain, query, input.labels).slice(
    0,
    Math.max(limit, 6),
  );
  const hits = labels.map((label, index) => {
    const coords = orbit(baseLat, baseLng, index);
    return {
      id: `search:${input.domain}:${index}:${label}`,
      labelKo: label,
      domain: input.domain,
      lat: coords.lat,
      lng: coords.lng,
      rating: Number((4.6 - index * 0.15).toFixed(1)),
      walkMinutes: 4 + index * 3,
      reservable: index % 2 === 0,
      localFavorite: seedLocalFavorite(label, index, query),
      priceBand: 1 + (index % 3),
      source: "seed" as const,
      reviewCount: 120 - index * 25 + (index === 1 ? 80 : 0),
      priceKrw: null,
    };
  });
  const controlled = input.fieldSearch
    ? applyFieldControlToPlaceHits(hits, input.fieldSearch)
    : hits;
  const kept = controlled.length > 0 ? controlled : hits;
  return rankByValueConsensus(kept).slice(0, limit);
}
