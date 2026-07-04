import type { ContextEateryInventoryRow } from "@/lib/globe/eatery/eatery-resource-types";

/** Demo eateries near user — keep labels region-neutral when providers fail. */
export function resolveEateryMockNearUser(input: {
  lat: number;
  lng: number;
}): readonly ContextEateryInventoryRow[] {
  const mLat = (m: number) => m / 111_320;
  const mLng = (m: number) => m / (111_320 * Math.cos((input.lat * Math.PI) / 180));

  return [
    {
      placeId: "fd-hongdae-gopchang",
      name: "로컬 곱창집",
      lat: input.lat + mLat(95),
      lng: input.lng + mLng(70),
      images: [
        "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=640&q=80",
      ],
      cuisineHint: "곱창",
      priceLevel: 2,
    },
    {
      placeId: "fd-hongdae-ramen",
      name: "동네 라멘집",
      lat: input.lat + mLat(210),
      lng: input.lng - mLng(120),
      images: [
        "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=640&q=80",
      ],
      cuisineHint: "라멘",
      priceLevel: 2,
    },
    {
      placeId: "fd-hongdae-brunch",
      name: "브런치 카페",
      lat: input.lat - mLat(160),
      lng: input.lng + mLng(200),
      images: [
        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=640&q=80",
      ],
      cuisineHint: "브런치",
      priceLevel: 3,
    },
    {
      placeId: "fd-hongdae-kbbq",
      name: "골목 한식당",
      lat: input.lat - mLat(280),
      lng: input.lng - mLng(90),
      images: [
        "https://images.unsplash.com/photo-1544025162-d76694265947?w=640&q=80",
      ],
      cuisineHint: "한식",
      priceLevel: 2,
    },
  ];
}
