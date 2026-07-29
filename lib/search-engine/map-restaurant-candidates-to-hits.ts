/**
 * Map unified restaurant search → Search Engine PlaceSearchHit.
 */

import { haversineKm } from "@/lib/feed/spacetime-fit";
import type { PlaceSearchHit } from "@/lib/search-engine/run-place-search";
import type { RestaurantSearchCandidate } from "@/lib/restaurant-search/types";

function walkMinutesFromKm(km: number): number {
  return Math.max(1, Math.round(km / 0.08));
}

export function mapRestaurantCandidatesToPlaceHits(input: {
  readonly candidates: readonly RestaurantSearchCandidate[];
  readonly query: string;
  readonly anchorLat?: number | null;
  readonly anchorLng?: number | null;
  readonly localityMode?: "local" | "landmark" | "balanced" | null;
}): readonly PlaceSearchHit[] {
  const anchorLat = input.anchorLat;
  const anchorLng = input.anchorLng;

  return input.candidates.map((candidate, index) => {
    const km =
      anchorLat != null && anchorLng != null
        ? haversineKm(anchorLat, anchorLng, candidate.lat, candidate.lng)
        : 0.4 + index * 0.15;
    const localFavorite =
      input.localityMode === "local" ||
      Boolean(candidate.specialReasonKo?.includes("현지")) ||
      /로컬|현지|골목/iu.test(candidate.name) ||
      /로컬|현지/iu.test(input.query);

    return {
      id: `maps:${candidate.placeId}`,
      labelKo: candidate.name,
      domain: "eatery" as const,
      lat: candidate.lat,
      lng: candidate.lng,
      rating: candidate.rating,
      walkMinutes: walkMinutesFromKm(km),
      reservable: candidate.openNow !== false,
      localFavorite,
      priceBand:
        candidate.priceLevel != null && candidate.priceLevel > 0
          ? candidate.priceLevel
          : null,
      source: "maps" as const,
      reviewCount:
        typeof candidate.reviewCount === "number" &&
        Number.isFinite(candidate.reviewCount)
          ? Math.round(candidate.reviewCount)
          : null,
      amountLabel: null,
      priceKrw: null,
      reasonKo: candidate.specialReasonKo?.trim() || null,
      thumbnailUrl: candidate.images[0] ?? null,
    };
  });
}
