/**
 * Eatery photo gallery — provider photos only.
 * Naver Image / CSE web fill is disabled (mismatched stock food shots).
 */

import type { PlaceCandidate } from "@/lib/context-resolver/places/types";
import { keepProviderPlacePhotos } from "@/lib/globe/venue-media-fidelity";

/** @deprecated Web scrape disabled — always empty. Prefer Google Places photos. */
export async function fetchFoodPhotoUrls(_input: {
  name: string;
  anchor: string | null;
  cuisine?: string | null;
}): Promise<string[]> {
  return [];
}

/** Keep provider photos only — never invent web-search food heroes. */
export async function attachPlaceThumbnails(
  candidates: PlaceCandidate[],
  _input: string | null | { anchor: string | null; cuisine?: string | null },
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
