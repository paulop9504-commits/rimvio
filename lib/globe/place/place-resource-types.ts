/** Generic Place Resource — non-lodging discovery supply (activity · amenity · eatery). */
export type PlaceResourcePayload = {
  placeId: string;
  name: string;
  images: readonly string[];
  address?: string | null;
  cuisineHint?: string | null;
  priceLevel?: number | null;
  rating?: number | null;
  /** Review volume — thin stacks filtered at inventory / rank gates. */
  reviewCount?: number | null;
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

export type ContextPlaceInventoryRow = PlaceResourcePayload & {
  lat: number;
  lng: number;
};

export type PlaceInventorySource =
  | "google_places"
  | "naver_local"
  | "mock"
  | "multi_provider";

export type ContextPlaceInventory = {
  rows: ContextPlaceInventoryRow[];
  source: PlaceInventorySource;
};
