/**
 * Attraction / amenity photo gallery — provider photos only.
 * Web Image Search / CSE fill is disabled (fake stock on pharmacies · landmarks).
 */

import type { PlaceCandidate } from "@/lib/context-resolver/places/types";
import { keepProviderPlacePhotos } from "@/lib/globe/venue-media-fidelity";

/** @deprecated Web scrape disabled — always empty. Prefer Google Places photos. */
export async function fetchAttractionPhotoUrls(_input: {
  name: string;
  anchor: string | null;
}): Promise<string[]> {
  return [];
}

export type PlaceThumbnailDomain = "eatery" | "activity" | "amenity";

/** Keep Google Places / listing photos; do not web-scrape heroes. */
export async function attachPlaceThumbnailsForDomain(
  candidates: PlaceCandidate[],
  _input: {
    anchor: string | null;
    cuisine?: string | null;
    domain: PlaceThumbnailDomain;
  },
): Promise<PlaceCandidate[]> {
  return candidates.map((place) => {
    const kept = keepProviderPlacePhotos({
      thumbnailUrl: place.thumbnail_url,
      photoUrls: place.photo_urls,
      placeId: place.place_id,
    });
    return {
      ...place,
      thumbnail_url: kept.thumbnail_url,
      photo_urls: kept.photo_urls,
    };
  });
}
