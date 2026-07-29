import {
  Client,
  Language,
  PlaceInputType,
} from "@googlemaps/google-maps-services-js";
import { googlePlacesApiKey } from "@/lib/locate/google-places-config";
import { sharesPlaceBrand } from "@/lib/locate/branch-label";
import type { LocatePlaceResult } from "@/lib/locate/types";

const client = new Client({});

const MAX_CANDIDATES = 5;

function toPlaceResult(
  candidate: {
    name?: string;
    formatted_address?: string;
    place_id?: string;
    geometry?: { location?: { lat?: number; lng?: number } };
    rating?: number;
    user_ratings_total?: number;
    price_level?: number;
  },
  fallbackName: string
): LocatePlaceResult | null {
  const lat = candidate.geometry?.location?.lat;
  const lng = candidate.geometry?.location?.lng;

  if (typeof lat !== "number" || typeof lng !== "number") {
    return null;
  }

  const rating =
    typeof candidate.rating === "number" && Number.isFinite(candidate.rating)
      ? candidate.rating
      : null;
  const reviewCount =
    typeof candidate.user_ratings_total === "number" &&
    Number.isFinite(candidate.user_ratings_total)
      ? Math.round(candidate.user_ratings_total)
      : null;
  const priceLevel =
    typeof candidate.price_level === "number" &&
    Number.isFinite(candidate.price_level)
      ? Math.round(candidate.price_level)
      : null;

  return {
    place_name: candidate.name?.trim() || fallbackName,
    formatted_address: candidate.formatted_address ?? null,
    lat,
    lng,
    google_place_id: candidate.place_id ?? null,
    cached: false,
    rating,
    reviewCount,
    priceLevel,
  };
}

export async function findPlacesByName(input: {
  placeName: string;
  userLat?: number | null;
  userLng?: number | null;
  maxResults?: number;
}): Promise<LocatePlaceResult[]> {
  const key = googlePlacesApiKey();
  if (!key) {
    return [];
  }

  const params: Parameters<typeof client.findPlaceFromText>[0]["params"] = {
    input: input.placeName,
    inputtype: PlaceInputType.textQuery,
    fields: [
      "formatted_address",
      "geometry",
      "name",
      "place_id",
      "rating",
      "user_ratings_total",
      "price_level",
    ],
    language: Language.ko,
    key,
  };

  if (
    typeof input.userLat === "number" &&
    typeof input.userLng === "number" &&
    Number.isFinite(input.userLat) &&
    Number.isFinite(input.userLng)
  ) {
    params.locationbias = `circle:50000@${input.userLat},${input.userLng}`;
  }

  try {
    const response = await client.findPlaceFromText({ params });
    const limit = input.maxResults ?? MAX_CANDIDATES;
    const seen = new Set<string>();
    const results: LocatePlaceResult[] = [];

    for (const candidate of response.data.candidates ?? []) {
      const place = toPlaceResult(candidate, input.placeName);
      if (!place) {
        continue;
      }

      const dedupeKey = place.google_place_id ?? `${place.lat},${place.lng}`;
      if (seen.has(dedupeKey)) {
        continue;
      }

      if (!sharesPlaceBrand(place.place_name, input.placeName)) {
        continue;
      }

      seen.add(dedupeKey);
      results.push(place);

      if (results.length >= limit) {
        break;
      }
    }

    return results;
  } catch {
    return [];
  }
}

/** @deprecated use findPlacesByName */
export async function findPlaceByName(input: {
  placeName: string;
  userLat?: number | null;
  userLng?: number | null;
}): Promise<LocatePlaceResult | null> {
  const places = await findPlacesByName(input);
  return places[0] ?? null;
}
