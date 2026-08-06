export type LocateVisionResult = {
  place_name: string | null;
  confidence?: number;
  context_signal?: string;
  search_query?: string | null;
};

export type LocatePlaceResult = {
  place_name: string;
  formatted_address: string | null;
  lat: number;
  lng: number;
  google_place_id: string | null;
  cached: boolean;
  /** Google Places rating when requested. */
  rating?: number | null;
  /** Google user_ratings_total. */
  reviewCount?: number | null;
  /** Google price_level 0–4. */
  priceLevel?: number | null;
  /** First Google photo reference when requested. */
  photoReference?: string | null;
  /** Absolute Place Photo URL when key was available at fetch time. */
  thumbnailUrl?: string | null;
};

export type LocateActionResult = {
  context_signal: string;
  place_name: string;
  formatted_address: string | null;
  lat: number;
  lng: number;
  cached: boolean;
  reasoning_path?: string;
  confidence_score?: number;
  is_ocr_relied?: boolean;
  primary_action: {
    label: string;
    href: string;
    copyText: string;
  };
  secondary_actions: Array<{
    label: string;
    href: string;
    copyText?: string;
    fallbackHref?: string;
  }>;
};
