import type { PlaceVibe } from "@/lib/context-resolver/places/types";
import type { CanonicalPlaceProfile } from "@/lib/globe/canonical-place-profile";

export type RestaurantSearchCountryBias = "kr" | "jp" | "global";

export type RestaurantSearchCandidateSource =
  | "google_places"
  | "naver_local"
  | "mock";

export type RestaurantSearchIntent = {
  query: string;
  cuisine: string | null;
  excludeKeywords: string[];
  vibe: PlaceVibe;
  openNowOnly: boolean;
  localityMode: "local" | "landmark" | "balanced";
};

export type RestaurantSearchInput = {
  query: string;
  origin: { lat: number; lng: number } | null;
  anchorLabel?: string | null;
  countryBias?: RestaurantSearchCountryBias | null;
  placeProfile?: CanonicalPlaceProfile | null;
  maxResults?: number;
  radiusM?: number;
};

export type RestaurantSearchCandidate = {
  source: RestaurantSearchCandidateSource;
  sourceLabel: string;
  placeId: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  rating: number | null;
  openNow: boolean | null;
  phone: string | null;
  mapsUrl: string | null;
  images: readonly string[];
  cuisineHint?: string | null;
  priceLevel?: number | null;
  categoryLabel?: string | null;
  description?: string | null;
  specialReasonKo?: string | null;
  specialScore?: number | null;
  searchScore?: number | null;
  virtualCandidate?: true;
};

export type RestaurantSearchResult = {
  intent: RestaurantSearchIntent;
  countryBias: RestaurantSearchCountryBias;
  candidates: RestaurantSearchCandidate[];
  providerBreakdown: Partial<Record<RestaurantSearchCandidateSource, number>>;
  followupQuestionKo: string | null;
};
