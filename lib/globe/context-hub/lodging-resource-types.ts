/** Lodging Resource payload — Hub factory emit (L3). */
export type LodgingProviderId = "google_places" | "mock" | "liteapi";

export type LodgingStayWindow = {
  checkInIso?: string | null;
  checkOutIso?: string | null;
  nights?: number | null;
  confidence?: "confirmed" | "estimated" | "open";
};

export type LodgingRoomOffer = {
  id: string;
  title: string;
  occupancyLabelKo: string;
  priceKrw: number | null;
  totalPriceKrw: number | null;
  refundable: boolean;
  roomCount: number;
  guestCount: number;
  sourceLabelKo: string;
  /** LiteAPI offerId — prebook → payment → book */
  providerOfferId?: string | null;
  providerRateId?: string | null;
  /** LiteAPI mappedRoomId — links to /data/hotel rooms[].photos */
  mappedRoomId?: string | null;
  /** Room-specific gallery (up to 3); property images used as fallback in UI */
  imageUrls?: readonly string[];
};

export type LodgingPhotoSource =
  | "google_places_details"
  | "google_places_nearby"
  | "mock"
  | "liteapi";

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
  rating?: number | null;
  reviewCount?: number | null;
  provider?: LodgingProviderId | null;
  photoSource?: LodgingPhotoSource | null;
  photoConfidence?: LodgingPhotoConfidence | null;
  stayWindow?: LodgingStayWindow | null;
  roomOffers?: readonly LodgingRoomOffer[];
  liteapiHotelId?: string | null;
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
