import type { ContextEateryInventoryRow } from "@/lib/globe/eatery/eatery-resource-types";
import { inferMapRegionBias } from "@/lib/globe/infer-area-curiosity-hook";

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
    images: ["https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=640&q=80"],
    cuisineHint: "곱창",
    priceLevel: 2,
    provider: "mock",
  },
  {
    placeId: "mock-kr-ramen",
    name: "동네 라멘집",
    images: ["https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=640&q=80"],
    cuisineHint: "라멘",
    priceLevel: 2,
    provider: "mock",
  },
  {
    placeId: "mock-kr-brunch",
    name: "브런치 카페",
    images: ["https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=640&q=80"],
    cuisineHint: "브런치",
    priceLevel: 3,
    provider: "mock",
  },
  {
    placeId: "mock-kr-kbbq",
    name: "골목 한식당",
    images: ["https://images.unsplash.com/photo-1544025162-d76694265947?w=640&q=80"],
    cuisineHint: "한식",
    priceLevel: 2,
    provider: "mock",
  },
];

const JP_MOCK: readonly Omit<ContextEateryInventoryRow, "lat" | "lng">[] = [
  {
    placeId: "mock-jp-ramen",
    name: "골목 라멘",
    images: ["https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=640&q=80"],
    cuisineHint: "라멘",
    priceLevel: 2,
    provider: "mock",
  },
  {
    placeId: "mock-jp-izakaya",
    name: "로컬 이자카야",
    images: ["https://images.unsplash.com/photo-1551218808-94e220e084d2?w=640&q=80"],
    cuisineHint: "이자카야",
    priceLevel: 2,
    provider: "mock",
  },
  {
    placeId: "mock-jp-tonkatsu",
    name: "돈카츠 집",
    images: ["https://images.unsplash.com/photo-1544025162-d76694265947?w=640&q=80"],
    cuisineHint: "돈카츠",
    priceLevel: 2,
    provider: "mock",
  },
  {
    placeId: "mock-jp-cafe",
    name: "골목 카페",
    images: ["https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=640&q=80"],
    cuisineHint: "카페",
    priceLevel: 3,
    provider: "mock",
  },
];

/** Region-aware demo eateries — never mix KR names into JP anchors. */
export function resolveEateryMockNearOrigin(input: {
  lat: number;
  lng: number;
  anchorLabel?: string | null;
}): readonly ContextEateryInventoryRow[] {
  const region = inferMapRegionBias({
    lat: input.lat,
    lng: input.lng,
    areaLabel: input.anchorLabel,
  });
  const seed = region === "jp" ? JP_MOCK : KR_MOCK;
  return seed.map((row, index) => ({
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
