import {
  Client,
  Language,
} from "@googlemaps/google-maps-services-js";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import { googlePlacesApiKey, isGooglePlacesConfigured } from "@/lib/locate/google-places-config";
import {
  bibGourmandQueryForBias,
  markBibGourmandCandidate,
} from "@/lib/restaurant-search/bib-gourmand";
import { readGoogleUserRatingsTotal } from "@/lib/places/min-review-count-gate";
import type {
  RestaurantSearchCandidate,
  RestaurantSearchCountryBias,
} from "@/lib/restaurant-search/types";

const client = new Client({});

function buildPlacePhotoUrl(photoReference: string, key: string): string {
  const params = new URLSearchParams({
    maxwidth: "640",
    photo_reference: photoReference,
    key,
  });
  return `https://maps.googleapis.com/maps/api/place/photo?${params.toString()}`;
}

/**
 * Live lookup — returns nearby places Google associates with Bib Gourmand.
 * Empty when Places is off or the zone has no hits (caller must not invent).
 */
export async function fetchBibGourmandPlaces(input: {
  origin: { lat: number; lng: number };
  countryBias: RestaurantSearchCountryBias;
  areaLabel?: string | null;
  radiusM: number;
  maxResults?: number;
  language: Language;
}): Promise<RestaurantSearchCandidate[]> {
  if (!isGooglePlacesConfigured()) {
    return [];
  }
  const key = googlePlacesApiKey();
  if (!key) {
    return [];
  }

  const maxResults = Math.min(Math.max(input.maxResults ?? 4, 1), 6);
  const radiusM = Math.min(Math.max(input.radiusM, 2500), 25000);
  const query = bibGourmandQueryForBias(input.countryBias, input.areaLabel);

  try {
    const response = await client.textSearch({
      params: {
        query,
        location: input.origin,
        radius: radiusM,
        language: input.language,
        key,
      },
    });

    const rows: RestaurantSearchCandidate[] = [];
    for (const result of response.data.results ?? []) {
      const placeId = result.place_id?.trim();
      const name = result.name?.trim();
      const lat = result.geometry?.location?.lat;
      const lng = result.geometry?.location?.lng;
      if (
        !placeId ||
        !name ||
        typeof lat !== "number" ||
        typeof lng !== "number"
      ) {
        continue;
      }
      const types = result.types?.map((type) => String(type)) ?? [];
      if (
        types.length > 0 &&
        !types.some((type) =>
          /restaurant|food|meal|cafe|bar|bakery/i.test(type),
        )
      ) {
        continue;
      }
      const distanceKm = haversineKm(
        input.origin.lat,
        input.origin.lng,
        lat,
        lng,
      );
      if (distanceKm * 1000 > radiusM * 1.25) {
        continue;
      }
      const photoReference = result.photos?.[0]?.photo_reference;
      const images = photoReference
        ? [buildPlacePhotoUrl(photoReference, key)]
        : [];
      rows.push(
        markBibGourmandCandidate({
          source: "google_places",
          sourceLabel: "Google Places",
          placeId,
          name,
          address: result.formatted_address ?? result.vicinity ?? null,
          lat,
          lng,
          rating: typeof result.rating === "number" ? result.rating : null,
          reviewCount: readGoogleUserRatingsTotal(
            (result as { user_ratings_total?: number }).user_ratings_total,
          ),
          openNow:
            typeof result.opening_hours?.open_now === "boolean"
              ? result.opening_hours.open_now
              : null,
          phone: null,
          mapsUrl: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
          images,
          cuisineHint: null,
          priceLevel:
            typeof result.price_level === "number" ? result.price_level : null,
          categoryLabel: "restaurant · bib_gourmand",
          description: "Michelin Bib Gourmand",
          virtualCandidate: true,
        }),
      );
      if (rows.length >= maxResults) {
        break;
      }
    }
    return rows;
  } catch {
    return [];
  }
}
