/** Lodging Resource payload — Hub factory emit (L3). */
export type LodgingProviderId = "google_places" | "mock";

export type LodgingStayWindow = {
  checkInIso?: string | null;
  checkOutIso?: string | null;
  nights?: number | null;
  confidence?: "confirmed" | "estimated" | "open";
};

export type LodgingPhotoSource =
  | "google_places_details"
  | "google_places_nearby"
  | "mock";

export type LodgingPhotoConfidence =
  | "exact_place_id"
  | "strong_identity"
  | "nearby_identity"
  | "mock";

export type LodgingResourcePayload = {
  placeId: string;
  name: string;
  images: readonly string[];
  videoUrl?: string | null;
  priceKrw?: number | null;
  partnerLabel?: string | null;
  address?: string | null;
  mapsUrl?: string | null;
  provider?: LodgingProviderId | null;
  photoSource?: LodgingPhotoSource | null;
  photoConfidence?: LodgingPhotoConfidence | null;
  stayWindow?: LodgingStayWindow | null;
};

export const CONTEXT_LODGING_HUB_ENABLED_META_KEY = "contextLodgingHubEnabled";
export const CONTEXT_LODGING_INVENTORY_META_KEY = "contextLodgingInventory";
export const CONTEXT_LODGING_RECOMMEND_SCORES_META_KEY = "contextLodgingRecommendScores";

export type LodgingRecommendScoreWire = {
  score: number;
  reasonKo: string;
  matchReasons: readonly string[];
};

export type ContextLodgingInventoryRow = LodgingResourcePayload & {
  lat: number;
  lng: number;
  checkInIso?: string | null;
  checkOutIso?: string | null;
};
