import {
  Client,
  Language,
} from "@googlemaps/google-maps-services-js";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import { googlePlacesApiKey, isGooglePlacesConfigured } from "@/lib/locate/google-places-config";
import type { ContextEateryInventoryRow } from "@/lib/globe/eatery/eatery-resource-types";

const client = new Client({});

const EATERY_TYPES = ["restaurant", "cafe", "meal_takeaway", "bakery"] as const;
const DEFAULT_RADIUS_M = 500;
const DEFAULT_MAX_RESULTS = 5;

function buildPlacePhotoUrl(photoReference: string, key: string): string {
  const params = new URLSearchParams({
    maxwidth: "640",
    photo_reference: photoReference,
    key,
  });
  return `https://maps.googleapis.com/maps/api/place/photo?${params.toString()}`;
}

/** Google Places Nearby — multiple food POIs (server-side). */
export async function fetchPlacesEateryNearby(input: {
  lat: number;
  lng: number;
  maxResults?: number;
  radiusM?: number;
}): Promise<ContextEateryInventoryRow[]> {
  if (!isGooglePlacesConfigured()) {
    return [];
  }

  const key = googlePlacesApiKey();
  if (!key) {
    return [];
  }

  const maxResults = input.maxResults ?? DEFAULT_MAX_RESULTS;
  const radiusM = input.radiusM ?? DEFAULT_RADIUS_M;
  const byPlaceId = new Map<string, ContextEateryInventoryRow>();

  for (const type of EATERY_TYPES) {
    try {
      const response = await client.placesNearby({
        params: {
          location: { lat: input.lat, lng: input.lng },
          radius: radiusM,
          type,
          language: Language.ko,
          key,
        },
      });

      for (const result of response.data.results ?? []) {
        const lat = result.geometry?.location?.lat;
        const lng = result.geometry?.location?.lng;
        const name = result.name?.trim();
        const placeId = result.place_id?.trim();
        if (
          typeof lat !== "number" ||
          typeof lng !== "number" ||
          !name ||
          !placeId
        ) {
          continue;
        }

        const distanceKm = haversineKm(input.lat, input.lng, lat, lng);
        if (distanceKm * 1000 > radiusM) {
          continue;
        }

        const photoRef = result.photos?.[0]?.photo_reference;
        const images = photoRef ? [buildPlacePhotoUrl(photoRef, key)] : [];

        const row: ContextEateryInventoryRow = {
          placeId,
          name,
          lat,
          lng,
          images,
          cuisineHint: type === "cafe" ? "카페" : null,
          priceLevel: result.price_level ?? null,
        };

        const existing = byPlaceId.get(placeId);
        if (!existing || (existing.images.length === 0 && images.length > 0)) {
          byPlaceId.set(placeId, row);
        }
      }
    } catch {
      // try next type
    }
  }

  return [...byPlaceId.values()]
    .sort(
      (left, right) =>
        haversineKm(input.lat, input.lng, left.lat, left.lng) -
        haversineKm(input.lat, input.lng, right.lat, right.lng),
    )
    .slice(0, maxResults);
}
