import type { ContextEateryInventoryRow } from "@/lib/globe/eatery/eatery-resource-types";
import { isCoordInKorea } from "@/lib/globe/geo-region-from-coords";

function mLat(meters: number): number {
  return meters / 111_320;
}

function mLng(meters: number, lat: number): number {
  return meters / (111_320 * Math.cos((lat * Math.PI) / 180));
}

const KR_MOCK: readonly Omit<ContextEateryInventoryRow, "lat" | "lng">[] = [
  {
    placeId: "mock-kr-gopchang",
    name: "로컬 곱창집",
    images: [],
    cuisineHint: "곱창",
    priceLevel: 2,
    provider: "mock",
  },
  {
    placeId: "mock-kr-ramen",
    name: "동네 라멘집",
    images: [],
    cuisineHint: "라멘",
    priceLevel: 2,
    provider: "mock",
  },
  {
    placeId: "mock-kr-brunch",
    name: "브런치 카페",
    images: [],
    cuisineHint: "브런치",
    priceLevel: 3,
    provider: "mock",
  },
  {
    placeId: "mock-kr-kbbq",
    name: "골목 한식당",
    images: [],
    cuisineHint: "한식",
    priceLevel: 2,
    provider: "mock",
  },
];

/** Korea-only demo eateries — overseas coords return empty (Google Places is SSOT abroad). */
export function resolveEateryMockNearOrigin(input: {
  lat: number;
  lng: number;
  anchorLabel?: string | null;
}): readonly ContextEateryInventoryRow[] {
  if (!isCoordInKorea(input.lat, input.lng)) {
    return [];
  }
  return KR_MOCK.map((row, index) => ({
    ...row,
    lat: input.lat + mLat(95 + index * 115),
    lng: input.lng + mLng(index % 2 === 0 ? 70 : -90, input.lat),
    virtualCandidate: true,
  }));
}

/** @deprecated Use resolveEateryMockNearOrigin */
export function resolveEateryMockNearUser(input: {
  lat: number;
  lng: number;
}): readonly ContextEateryInventoryRow[] {
  return resolveEateryMockNearOrigin(input);
}
