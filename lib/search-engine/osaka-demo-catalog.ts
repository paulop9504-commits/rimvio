/**
 * Osaka 30s demo catalog — real-ish coords for APA branches + nearby eateries.
 * Search Engine prefers this when utterance/anchor smells like Osaka / APA.
 * Maps API plugs in via runPlaceSearchAsync; this stays the deterministic fallback.
 */

import type { GraphEntityDomain } from "@/lib/graph-command/types";
import type { PlaceSearchHit } from "@/lib/search-engine/run-place-search";

/** APA Hotel Osaka Namba (難波) — approx. */
export const OSAKA_APA_NAMBA = {
  id: "lodging:apa-namba",
  labelKo: "APA 난바",
  lat: 34.6654,
  lng: 135.5019,
} as const;

/** APA Hotel Osaka Umeda (梅田) — approx. */
export const OSAKA_APA_UMEDA = {
  id: "lodging:apa-umeda",
  labelKo: "APA 우메다",
  lat: 34.7015,
  lng: 135.4968,
} as const;

export const OSAKA_CENTER = {
  lat: 34.6937,
  lng: 135.5023,
} as const;

export type OsakaCatalogPlace = {
  readonly id: string;
  readonly labelKo: string;
  readonly domain: GraphEntityDomain;
  readonly lat: number;
  readonly lng: number;
  readonly rating: number;
  readonly walkMinutesFromNamba: number;
  readonly reservable: boolean;
  /** Thicker “현지인” signal for filter / ranking. */
  readonly localFavorite: boolean;
  readonly priceBand: number;
  readonly aliases: readonly string[];
  /** Display price when known (KRW or ₩ band). */
  readonly amountLabel?: string | null;
  readonly thumbnailUrl?: string | null;
};

export const OSAKA_APA_BRANCHES: readonly OsakaCatalogPlace[] = [
  {
    id: OSAKA_APA_NAMBA.id,
    labelKo: OSAKA_APA_NAMBA.labelKo,
    domain: "lodging",
    lat: OSAKA_APA_NAMBA.lat,
    lng: OSAKA_APA_NAMBA.lng,
    rating: 4.3,
    walkMinutesFromNamba: 0,
    reservable: true,
    localFavorite: false,
    priceBand: 2,
    amountLabel: "₩12만/박",
    aliases: ["APA호텔", "APA", "아파호텔", "난바 APA", "APA 난바", "アパホテル難波"],
  },
  {
    id: OSAKA_APA_UMEDA.id,
    labelKo: OSAKA_APA_UMEDA.labelKo,
    domain: "lodging",
    lat: OSAKA_APA_UMEDA.lat,
    lng: OSAKA_APA_UMEDA.lng,
    rating: 4.2,
    walkMinutesFromNamba: 18,
    reservable: true,
    localFavorite: false,
    priceBand: 2,
    amountLabel: "₩13만/박",
    aliases: ["APA 우메다", "우메다 APA", "アパホテル梅田"],
  },
];

/** Namba-area attractions — soft fallback when live POI search is empty. */
export const OSAKA_NAMBA_POIS: readonly OsakaCatalogPlace[] = [
  {
    id: "poi:osaka:namba-parks",
    labelKo: "난바 파크스",
    domain: "poi",
    lat: 34.6615,
    lng: 135.5019,
    rating: 4.3,
    walkMinutesFromNamba: 8,
    reservable: false,
    localFavorite: false,
    priceBand: 1,
    aliases: ["난바파크스", "Namba Parks", "놀거리", "관광"],
  },
  {
    id: "poi:osaka:dotonbori",
    labelKo: "도톤보리",
    domain: "poi",
    lat: 34.6687,
    lng: 135.5013,
    rating: 4.5,
    walkMinutesFromNamba: 10,
    reservable: false,
    localFavorite: true,
    priceBand: 1,
    aliases: ["도톤보리", "Dotonbori", "글리코", "놀거리"],
  },
  {
    id: "poi:osaka:kuromon",
    labelKo: "쿠로몬 시장",
    domain: "poi",
    lat: 34.6662,
    lng: 135.5062,
    rating: 4.2,
    walkMinutesFromNamba: 12,
    reservable: false,
    localFavorite: true,
    priceBand: 1,
    aliases: ["쿠로몬", "Kuromon", "시장", "볼거리"],
  },
  {
    id: "poi:osaka:shinsaibashi",
    labelKo: "신사이바시",
    domain: "poi",
    lat: 34.6745,
    lng: 135.5012,
    rating: 4.3,
    walkMinutesFromNamba: 15,
    reservable: false,
    localFavorite: false,
    priceBand: 2,
    aliases: ["신사이바시", "Shinsaibashi", "쇼핑", "놀거리"],
  },
];

/** Nearby eateries around APA Namba — localFavorite thick for demo filter. */
export const OSAKA_NAMBA_EATERIES: readonly OsakaCatalogPlace[] = [
  {
    id: "eatery:osaka:kushikatsu-daruma",
    labelKo: "쿠시카츠 다루마",
    domain: "eatery",
    lat: 34.6689,
    lng: 135.5012,
    rating: 4.5,
    walkMinutesFromNamba: 6,
    reservable: true,
    localFavorite: true,
    priceBand: 2,
    aliases: ["다루마", "쿠시카츠"],
  },
  {
    id: "eatery:osaka:ichiran-namba",
    labelKo: "이치란 난바",
    domain: "eatery",
    lat: 34.6672,
    lng: 135.5028,
    rating: 4.4,
    walkMinutesFromNamba: 5,
    reservable: false,
    localFavorite: false,
    priceBand: 1,
    aliases: ["이치란"],
  },
  {
    id: "eatery:osaka:endouroji",
    labelKo: "엔도지로지",
    domain: "eatery",
    lat: 34.6641,
    lng: 135.4998,
    rating: 4.7,
    walkMinutesFromNamba: 8,
    reservable: true,
    localFavorite: true,
    priceBand: 2,
    aliases: ["현지 골목", "로컬 맛집"],
  },
  {
    id: "eatery:osaka:yakiniku-local",
    labelKo: "난바 골목 야키니쿠",
    domain: "eatery",
    lat: 34.666,
    lng: 135.5045,
    rating: 4.6,
    walkMinutesFromNamba: 7,
    reservable: true,
    localFavorite: true,
    priceBand: 3,
    aliases: ["야키니쿠", "고기"],
  },
  {
    id: "eatery:osaka:chain-cafe",
    labelKo: "체인 카페 난바",
    domain: "eatery",
    lat: 34.6658,
    lng: 135.5035,
    rating: 4.0,
    walkMinutesFromNamba: 3,
    reservable: false,
    localFavorite: false,
    priceBand: 1,
    aliases: ["카페"],
  },
];

export function looksLikeOsakaContext(input: {
  query?: string;
  anchorLat?: number | null;
  anchorLng?: number | null;
}): boolean {
  if (/오사카|大阪|osaka|난바|우메다|apa\s*호텔|아파/iu.test(input.query ?? "")) {
    return true;
  }
  const lat = input.anchorLat;
  const lng = input.anchorLng;
  if (lat == null || lng == null) {
    return false;
  }
  // Rough Osaka metro bbox
  return lat >= 34.55 && lat <= 34.85 && lng >= 135.35 && lng <= 135.65;
}

export function isBareApaBrandLabel(label: string): boolean {
  const t = label.trim();
  return /^(?:apa\s*호텔|apa|아파\s*호텔|アパホテル)$/iu.test(t);
}

function normalizePlaceLabel(s: string): string {
  return s.trim().replace(/\s+/gu, "").toLowerCase();
}

/**
 * Resolve a short place label to one APA branch.
 * Search utterances (“APA 호텔 찾아줘”) return null → catalog returns all branches.
 */
export function matchApaBranchLabel(label: string): OsakaCatalogPlace | null {
  const t = label.trim();
  if (!t || t.length > 24) {
    return null;
  }
  if (/찾|추천|보여|알려|골라|주변|근처|search|find/iu.test(t)) {
    return null;
  }

  const needle = normalizePlaceLabel(t);
  for (const branch of OSAKA_APA_BRANCHES) {
    if (normalizePlaceLabel(branch.labelKo) === needle) {
      return branch;
    }
    if (
      branch.aliases.some((a) => normalizePlaceLabel(a) === needle)
    ) {
      return branch;
    }
  }
  if (/난바|namba|難波/iu.test(t) && /apa|아파|アパ/iu.test(t)) {
    return OSAKA_APA_BRANCHES[0] ?? null;
  }
  if (/우메다|umeda|梅田/iu.test(t) && /apa|아파|アパ/iu.test(t)) {
    return OSAKA_APA_BRANCHES[1] ?? null;
  }
  return null;
}

function toHit(
  place: OsakaCatalogPlace,
  walkMinutes: number,
): PlaceSearchHit {
  const thumb = place.thumbnailUrl?.trim() || null;
  const amount =
    place.amountLabel?.trim() ||
    (place.domain === "lodging" && place.priceBand === 2
      ? "₩12만/박"
      : place.priceBand === 1
        ? "₩"
        : place.priceBand === 2
          ? "₩₩"
          : place.priceBand >= 3
            ? "₩₩₩"
            : null);
  return {
    id: place.id,
    labelKo: place.labelKo,
    domain: place.domain,
    lat: place.lat,
    lng: place.lng,
    rating: place.rating,
    walkMinutes,
    reservable: place.reservable,
    localFavorite: place.localFavorite,
    priceBand: place.priceBand,
    source: "seed",
    amountLabel: amount,
    thumbnailUrl: thumb,
    images: thumb ? [thumb] : null,
  };
}

/**
 * Deterministic Osaka demo hits — lodging APA **only when APA is named**.
 * Capsule / budget / generic lodging must NOT hijack to APA Namba·Umeda.
 */
export function searchOsakaDemoCatalog(input: {
  query: string;
  domain: GraphEntityDomain;
  limit?: number;
  anchorLat?: number | null;
  anchorLng?: number | null;
}): readonly PlaceSearchHit[] | null {
  if (!looksLikeOsakaContext(input)) {
    return null;
  }
  const limit = input.limit ?? 4;
  const q = input.query;

  // Stay-type / budget Fields → never APA seed (scout + live inventory owns this).
  if (
    /캡슐|capsule|게스트\s*하우스|호스텔|hostel|guesthouse|료칸|민박|도미토리|dorm/iu.test(
      q,
    ) ||
    /\d+\s*만\s*원?|미만|이하|하루|1\s*박/iu.test(q)
  ) {
    if (input.domain === "lodging" || /호텔|숙소|캡슐|hostel|게스트/iu.test(q)) {
      return null;
    }
  }

  // Explicit APA brand only.
  if (/apa|아파|アパ/iu.test(q)) {
    const branch = matchApaBranchLabel(q);
    if (branch) {
      return [toHit(branch, branch.walkMinutesFromNamba)].slice(0, limit);
    }
    return OSAKA_APA_BRANCHES.map((b) =>
      toHit(b, b.walkMinutesFromNamba),
    ).slice(0, limit);
  }

  if (input.domain === "eatery" || /맛집|식당|현지|고기|주변|근처/iu.test(q)) {
    let rows = [...OSAKA_NAMBA_EATERIES];
    if (/현지|로컬|local/iu.test(q)) {
      rows = rows.filter((r) => r.localFavorite);
    }
    if (/예약/iu.test(q)) {
      rows = rows.filter((r) => r.reservable);
    }
    if (/고기|야키니쿠|bbq/iu.test(q)) {
      rows = rows.filter((r) =>
        /야키니쿠|고기/iu.test(r.labelKo + r.aliases.join(" ")),
      );
      if (rows.length === 0) {
        rows = OSAKA_NAMBA_EATERIES.filter((r) => r.localFavorite);
      }
    }
    return rows.map((r) => toHit(r, r.walkMinutesFromNamba)).slice(0, limit);
  }

  if (
    input.domain === "poi" ||
    /놀거리|볼거리|할거리|관광|명소|액티비티|things?\s*to\s*do|attraction/iu.test(
      q,
    )
  ) {
    return OSAKA_NAMBA_POIS.map((r) =>
      toHit(r, r.walkMinutesFromNamba),
    ).slice(0, limit);
  }

  // Generic lodging in Osaka without APA cue → null (live / mock keyword search).
  return null;
}
