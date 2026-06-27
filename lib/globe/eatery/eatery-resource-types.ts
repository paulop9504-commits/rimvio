/** Eatery Resource — map discovery supply (L3). */
export type EateryResourcePayload = {
  placeId: string;
  name: string;
  images: readonly string[];
  cuisineHint?: string | null;
  priceLevel?: number | null;
};

export const CONTEXT_EATERY_HUB_ENABLED_META_KEY = "contextEateryHubEnabled";
export const CONTEXT_EATERY_INVENTORY_META_KEY = "contextEateryInventory";
export const CONTEXT_EATERY_RECOMMEND_SCORES_META_KEY = "contextEateryRecommendScores";

export type EateryRecommendScoreWire = {
  score: number;
  reasonKo: string;
  matchReasons: readonly string[];
};

export type ContextEateryInventoryRow = EateryResourcePayload & {
  lat: number;
  lng: number;
};
