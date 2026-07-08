import type { PlaceResourcePayload } from "@/lib/globe/place/place-resource-types";

/** Eatery Resource — map discovery supply (L3). */
export type EateryResourcePayload = PlaceResourcePayload;

export const CONTEXT_EATERY_HUB_ENABLED_META_KEY = "contextEateryHubEnabled";
export const CONTEXT_EATERY_INVENTORY_META_KEY = "contextEateryInventory";
export const CONTEXT_EATERY_RECOMMEND_SCORES_META_KEY = "contextEateryRecommendScores";
export const CONTEXT_EATERY_PINNED_RESOURCE_ID_META_KEY = "contextEateryPinnedResourceId";
export const CONTEXT_EATERY_PINNED_PLACE_ID_META_KEY = "contextEateryPinnedPlaceId";

export type EateryRecommendScoreWire = {
  score: number;
  reasonKo: string;
  matchReasons: readonly string[];
};

export type ContextEateryInventoryRow = EateryResourcePayload & {
  lat: number;
  lng: number;
};
