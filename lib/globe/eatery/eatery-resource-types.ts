/** Eatery Resource — map discovery supply (L3). */
export type EateryResourcePayload = {
  placeId: string;
  name: string;
  images: readonly string[];
  address?: string | null;
  cuisineHint?: string | null;
  priceLevel?: number | null;
  rating?: number | null;
  openNow?: boolean | null;
  mapsUrl?: string | null;
  provider?: "google_places" | "naver_local" | "mock" | "multi_provider" | null;
  providerLabel?: string | null;
  categoryLabel?: string | null;
  specialReasonKo?: string | null;
  specialScore?: number | null;
  searchScore?: number | null;
  virtualCandidate?: true;
};

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
