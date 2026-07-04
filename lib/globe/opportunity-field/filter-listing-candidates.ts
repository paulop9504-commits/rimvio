import { marketCategoriesCompatible } from "@/lib/globe/market/market-category-registry";
import { resolveMarketIntentExposureAnchor } from "@/lib/globe/market/market-intent-exposure";
import { isMarketProductTitleMatchForSeeking } from "@/lib/globe/market/match-market-product-title";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import { haversineKm } from "@/lib/globe/trend-bridge/server/trend-bridge-geo";

export function isListingCandidateForSeeking(
  seeking: MarketIntentRecord,
  listing: MarketIntentRecord,
): boolean {
  if (!listing.active || listing.role !== "listing") {
    return false;
  }
  if (seeking.userId && listing.userId && seeking.userId === listing.userId) {
    return false;
  }
  if (!marketCategoriesCompatible(seeking.categoryId, listing.categoryId)) {
    return false;
  }
  if (!isMarketProductTitleMatchForSeeking(seeking, listing)) {
    return false;
  }
  const seekingAnchor = resolveMarketIntentExposureAnchor(seeking);
  const listingAnchor = resolveMarketIntentExposureAnchor(listing);
  const distanceKm = haversineKm(
    seekingAnchor.lat,
    seekingAnchor.lng,
    listingAnchor.lat,
    listingAnchor.lng,
  );
  const allowed = Math.min(seeking.radiusKm, listing.radiusKm);
  return distanceKm <= allowed;
}

export function resolveViewerDistanceKm(input: {
  seeking: MarketIntentRecord;
  listing: MarketIntentRecord;
  lat: number | null;
  lng: number | null;
}): number {
  const seekingAnchor = resolveMarketIntentExposureAnchor(input.seeking);
  const listingAnchor = resolveMarketIntentExposureAnchor(input.listing);
  if (
    input.lat != null &&
    input.lng != null &&
    Number.isFinite(input.lat) &&
    Number.isFinite(input.lng)
  ) {
    return haversineKm(
      input.lat,
      input.lng,
      listingAnchor.lat,
      listingAnchor.lng,
    );
  }
  return haversineKm(
    seekingAnchor.lat,
    seekingAnchor.lng,
    listingAnchor.lat,
    listingAnchor.lng,
  );
}
