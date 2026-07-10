import { buildAirbnbLodgingSearchUrl } from "@/lib/globe/context-hub/providers/airbnb/build-airbnb-lodging-search-url";
import { isAirbnbPartnerApiConfigured } from "@/lib/globe/context-hub/providers/airbnb/resolve-airbnb-integration-mode";
import type { AirbnbPartnerListingStub } from "@/lib/globe/context-hub/providers/airbnb/types";

export type FetchAirbnbPartnerListingsInput = {
  query: string;
  lat: number;
  lng: number;
  checkInYmd?: string | null;
  checkOutYmd?: string | null;
  adults?: number | null;
  maxResults?: number;
};

/**
 * Stub for Airbnb Homes API inventory.
 * Returns null until partner credentials are approved and wired.
 */
export async function fetchAirbnbPartnerListings(
  input: FetchAirbnbPartnerListingsInput,
): Promise<AirbnbPartnerListingStub[] | null> {
  if (!isAirbnbPartnerApiConfigured()) {
    return null;
  }

  // Partner API wiring lands here (OAuth + listing search).
  // Until then, callers should fall back to Google Places + handoff URL.
  void input;
  return null;
}

export function buildAirbnbPartnerHandoffFallback(
  input: FetchAirbnbPartnerListingsInput,
): string {
  return buildAirbnbLodgingSearchUrl({
    query: input.query,
    checkInYmd: input.checkInYmd,
    checkOutYmd: input.checkOutYmd,
    adults: input.adults,
    lat: input.lat,
    lng: input.lng,
  });
}
