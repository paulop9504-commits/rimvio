/**
 * Guide-web style seed hits for trip inventory burst.
 * Curated “정석 코스” candidates — not live scrape; SSOT stays Workspace picks.
 */

import type { GraphEntityDomain } from "@/lib/graph-command/types";
import type { PlaceSearchHit } from "@/lib/search-engine/run-place-search";

type GuideSeed = {
  readonly id: string;
  readonly labelKo: string;
  readonly domain: GraphEntityDomain;
  readonly lat: number;
  readonly lng: number;
  readonly rating: number;
  readonly indoor: boolean;
  readonly clusterIds: readonly string[];
  readonly dayParts: readonly string[];
};

const OSAKA_GUIDE_SEEDS: readonly GuideSeed[] = [
  {
    id: "guide:osaka:kuromon",
    labelKo: "쿠로몬 시장",
    domain: "poi",
    lat: 34.6662,
    lng: 135.5063,
    rating: 4.5,
    indoor: true,
    clusterIds: ["namba", "dotonbori"],
    dayParts: ["morning", "afternoon", "lunch"],
  },
  {
    id: "guide:osaka:namba-parks",
    labelKo: "난바 파크스",
    domain: "poi",
    lat: 34.6615,
    lng: 135.5022,
    rating: 4.4,
    indoor: true,
    clusterIds: ["namba", "dotonbori"],
    dayParts: ["morning", "afternoon"],
  },
  {
    id: "guide:osaka:dotonbori",
    labelKo: "도톤보리",
    domain: "poi",
    lat: 34.6687,
    lng: 135.5013,
    rating: 4.6,
    indoor: false,
    clusterIds: ["namba", "dotonbori"],
    dayParts: ["afternoon", "dinner"],
  },
  {
    id: "guide:osaka:osaka-castle",
    labelKo: "오사카성",
    domain: "poi",
    lat: 34.6873,
    lng: 135.5262,
    rating: 4.5,
    indoor: false,
    clusterIds: ["osaka_castle", "umeda"],
    dayParts: ["morning", "afternoon"],
  },
  {
    id: "guide:osaka:umeda-sky",
    labelKo: "우메다 스카이빌딩",
    domain: "poi",
    lat: 34.7055,
    lng: 135.4902,
    rating: 4.4,
    indoor: true,
    clusterIds: ["umeda"],
    dayParts: ["afternoon", "morning"],
  },
  {
    id: "guide:osaka:endouroji",
    labelKo: "엔도지로지",
    domain: "eatery",
    lat: 34.6641,
    lng: 135.4998,
    rating: 4.7,
    indoor: true,
    clusterIds: ["namba", "dotonbori"],
    dayParts: ["lunch", "dinner"],
  },
  {
    id: "guide:osaka:kushikatsu",
    labelKo: "쿠시카츠 다루마",
    domain: "eatery",
    lat: 34.6689,
    lng: 135.5012,
    rating: 4.5,
    indoor: true,
    clusterIds: ["namba", "dotonbori"],
    dayParts: ["dinner", "lunch"],
  },
];

const JEJU_GUIDE_SEEDS: readonly GuideSeed[] = [
  {
    id: "guide:jeju:seongsan",
    labelKo: "성산일출봉",
    domain: "poi",
    lat: 33.4581,
    lng: 126.9425,
    rating: 4.6,
    indoor: false,
    clusterIds: ["day_1", "day_2", "day_3", "day_4"],
    dayParts: ["morning", "afternoon"],
  },
  {
    id: "guide:jeju:blackpork",
    labelKo: "제주 흑돼지",
    domain: "eatery",
    lat: 33.4996,
    lng: 126.5312,
    rating: 4.5,
    indoor: true,
    clusterIds: ["day_1", "day_2", "day_3", "day_4"],
    dayParts: ["dinner", "lunch"],
  },
];

const TOKYO_GUIDE_SEEDS: readonly GuideSeed[] = [
  {
    id: "guide:tokyo:sensoji",
    labelKo: "센소지",
    domain: "poi",
    lat: 35.7148,
    lng: 139.7967,
    rating: 4.6,
    indoor: false,
    clusterIds: ["day_1", "day_2", "day_3", "day_4", "day_5"],
    dayParts: ["morning", "afternoon"],
  },
  {
    id: "guide:tokyo:shibuya",
    labelKo: "시부야 스크램블",
    domain: "poi",
    lat: 35.6595,
    lng: 139.7004,
    rating: 4.5,
    indoor: false,
    clusterIds: ["day_1", "day_2", "day_3", "day_4", "day_5"],
    dayParts: ["afternoon", "dinner"],
  },
];

function seedsForDestination(destinationKo: string): readonly GuideSeed[] {
  if (/오사카|大阪|osaka/iu.test(destinationKo)) return OSAKA_GUIDE_SEEDS;
  if (/제주|jeju/iu.test(destinationKo)) return JEJU_GUIDE_SEEDS;
  if (/도쿄|東京|tokyo/iu.test(destinationKo)) return TOKYO_GUIDE_SEEDS;
  return [];
}

function toHit(seed: GuideSeed): PlaceSearchHit {
  return {
    id: seed.id,
    labelKo: seed.labelKo,
    domain: seed.domain,
    lat: seed.lat,
    lng: seed.lng,
    rating: seed.rating,
    walkMinutes: 10,
    reservable: seed.domain === "eatery",
    localFavorite: true,
    priceBand: 2,
    source: "review",
    amountLabel: null,
    reasonKo: "가이드 정석 코스",
  };
}

/**
 * Guide-web seeds matching cluster + dayPart + domain for burst preferred list.
 */
export function guideWebSeedHits(input: {
  readonly destinationKo: string;
  readonly clusterId: string;
  readonly dayPart: string;
  readonly domain: GraphEntityDomain;
}): PlaceSearchHit[] {
  const seeds = seedsForDestination(input.destinationKo);
  return seeds
    .filter(
      (s) =>
        s.domain === input.domain &&
        (s.clusterIds.includes(input.clusterId) ||
          s.clusterIds.some((id) => id.startsWith("day_"))) &&
        s.dayParts.includes(input.dayPart),
    )
    .map(toHit);
}

export function guideSeedIsIndoor(hitId: string): boolean {
  const all = [...OSAKA_GUIDE_SEEDS, ...JEJU_GUIDE_SEEDS, ...TOKYO_GUIDE_SEEDS];
  return all.find((s) => s.id === hitId)?.indoor === true;
}
