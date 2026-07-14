/**
 * Semantic Layer — dictionary expand into Intent-ready paths.
 * Dictionary map only — no LLM.
 */

import type { EntityKind } from "@/lib/entity-resolver/types";

export type SemanticBrandProfile = {
  readonly brandId: string;
  readonly path: readonly string[];
  readonly kind: EntityKind;
};

const BRAND_SEMANTIC: Record<string, SemanticBrandProfile> = {
  mcdonalds: {
    brandId: "mcdonalds",
    kind: "Brand",
    path: ["Brand", "RestaurantChain", "FastFood", "Eatery"],
  },
  burgerking: {
    brandId: "burgerking",
    kind: "Brand",
    path: ["Brand", "RestaurantChain", "FastFood", "Eatery"],
  },
  kfc: {
    brandId: "kfc",
    kind: "Brand",
    path: ["Brand", "RestaurantChain", "FastFood", "Eatery"],
  },
  starbucks: {
    brandId: "starbucks",
    kind: "Brand",
    path: ["Brand", "CafeChain", "Cafe", "Eatery"],
  },
  lotteria: {
    brandId: "lotteria",
    kind: "Brand",
    path: ["Brand", "RestaurantChain", "FastFood", "Eatery"],
  },
};

export function semanticPathForBrand(brandId: string): readonly string[] {
  return BRAND_SEMANTIC[brandId]?.path ?? ["Brand", "Eatery"];
}

export function brandImpliesEatery(brandId: string): boolean {
  return (BRAND_SEMANTIC[brandId]?.path ?? []).includes("Eatery");
}

export const STATION_SEMANTIC_PATH = [
  "Station",
  "Transit",
  "Railway",
] as const;

export const AIRPORT_SEMANTIC_PATH = ["Airport", "Transit", "Air"] as const;

export const LOCATION_SEMANTIC_PATH = ["Location", "Place"] as const;

export const LANDMARK_SEMANTIC_PATH = [
  "Landmark",
  "POI",
  "Location",
] as const;

/** Matcha / tea — context picks among these. */
export const MATCHA_CANDIDATES_BARE = [
  { kind: "Drink" as const, confidence: 0.52 },
  { kind: "Dessert" as const, confidence: 0.44 },
  { kind: "Food" as const, confidence: 0.04 },
];

export function semanticPathForCuisine(input: {
  cuisineId: string;
  kind: EntityKind;
}): readonly string[] {
  if (input.cuisineId === "matcha_icecream" || input.kind === "Dessert") {
    return ["Dessert", "Food", "Eatery"];
  }
  if (input.cuisineId === "matcha" || input.kind === "Drink") {
    return ["Tea", "Drink", "DessertIngredient"];
  }
  if (input.kind === "Food") {
    return ["Food", "Eatery"];
  }
  return ["Food", "Eatery"];
}

export function entityPathImpliesEatery(path: readonly string[]): boolean {
  if (pathImpliesRetail(path) || pathImpliesLodging(path)) {
    return false;
  }
  return path.some((node) =>
    /^(Eatery|RestaurantChain|CafeChain|FastFood|Cafe|Dessert|Food|Tea|Drink)$/iu.test(
      node,
    ),
  );
}

export function pathImpliesLodging(path: readonly string[]): boolean {
  return path.some((node) =>
    /Lodging|HotelChain|Hotel|Ryokan|Capsule|Airbnb|Hostel|StayType/iu.test(
      node,
    ),
  );
}

export function pathImpliesRetail(path: readonly string[]): boolean {
  return path.some((node) => /Retail|Clothing|VarietyStore|Electronics|Beauty/iu.test(node));
}

export function pathImpliesAmenity(path: readonly string[]): boolean {
  return path.some((node) =>
    /Amenity|ConvenienceStore|Pharmacy|ATM|Onsen|Laundry|Retail/iu.test(node),
  );
}

export function pathImpliesLandmark(path: readonly string[]): boolean {
  return path.some((node) =>
    /Landmark|ThemePark|Temple|Park|Tower|Museum|POI/iu.test(node),
  );
}

export function pathImpliesFinance(path: readonly string[]): boolean {
  return path.some((node) => /Currency|Payment|Finance|Wallet/iu.test(node));
}
