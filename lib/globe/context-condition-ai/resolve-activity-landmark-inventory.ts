"use client";

import { fetchGlobeContextPlaceGeocode } from "@/lib/globe/align-globe-context-places";
import { classifyPlaceCategory } from "@/lib/globe/context-condition-ai/discovery-guard/classify-place-category";
import type { ContextPlaceInventoryRow } from "@/lib/globe/place/place-resource-types";
import { findPlacesByName } from "@/lib/locate/google-places-find";

/** Concrete attraction the user picked — not a generic "놀거리" bucket. */
const EXPLICIT_LANDMARK =
  /디즈니|disney|유니버설|universal|테마\s*파크|테마파크|놀이\s*공원|놀이공원|유원지|레고랜드|legoland|에버랜드|롯데\s*월드|오션파크|team\s*lab|스카이\s*트리|skytree|시부야\s*스카イ|東京タワー|東京スカイツリー|후지산|富士山|mount\s*fuji|하우스\s*텐보스|센소지|浅草寺|meiji\s*jingu|도톤보리|dotonbori|오사카\s*성|오사카성/iu;

export function isExplicitActivityLandmarkQuery(
  text: string | null | undefined,
): boolean {
  const trimmed = text?.trim();
  return Boolean(trimmed && EXPLICIT_LANDMARK.test(trimmed));
}

function landmarkCategoryLabel(name: string): string {
  const category = classifyPlaceCategory({ name });
  if (category === "theme_park") {
    return "theme_park";
  }
  if (category === "museum") {
    return "museum";
  }
  if (category === "park") {
    return "park";
  }
  if (category === "shopping") {
    return "shopping";
  }
  return "tourist_attraction";
}

/** Geocode a named landmark when restaurant-only search cannot surface it (e.g. Tokyo Disney). */
export async function resolveActivityLandmarkInventoryRow(input: {
  query: string;
  lat?: number | null;
  lng?: number | null;
}): Promise<ContextPlaceInventoryRow | null> {
  const query = input.query.trim();
  if (!query || !isExplicitActivityLandmarkQuery(query)) {
    return null;
  }

  const resolved = await fetchGlobeContextPlaceGeocode({
    place: query,
    userLat: input.lat ?? null,
    userLng: input.lng ?? null,
  });

  if (
    resolved &&
    Number.isFinite(resolved.lat) &&
    Number.isFinite(resolved.lng)
  ) {
    const name = resolved.placeName?.trim() || resolved.label?.trim() || query;
    const placeId =
      resolved.mapsUrl?.trim() ||
      `landmark:${name.replace(/\s+/gu, "-").toLowerCase()}:${resolved.lat.toFixed(5)},${resolved.lng.toFixed(5)}`;

    return {
      placeId,
      name,
      lat: resolved.lat,
      lng: resolved.lng,
      images: [],
      address: resolved.formattedAddress ?? null,
      categoryLabel: landmarkCategoryLabel(name),
      provider: "google_places",
      providerLabel: "Google Places",
      mapsUrl: resolved.mapsUrl ?? null,
      cuisineHint: null,
      specialReasonKo: "명소로 찾았어요",
      virtualCandidate: true,
    };
  }

  const fallback = await findPlacesByName({
    placeName: query,
    userLat: input.lat ?? null,
    userLng: input.lng ?? null,
    maxResults: 1,
  });
  const picked = fallback[0];
  if (!picked) {
    return null;
  }

  const mapsUrl = picked.google_place_id
    ? `https://www.google.com/maps/place/?q=place_id:${picked.google_place_id}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(picked.place_name)}`;
  const name = picked.place_name.trim() || query;
  const placeId =
    picked.google_place_id?.trim() ||
    `landmark:${name.replace(/\s+/gu, "-").toLowerCase()}:${picked.lat.toFixed(5)},${picked.lng.toFixed(5)}`;

  return {
    placeId,
    name,
    lat: picked.lat,
    lng: picked.lng,
    images: [],
    address: picked.formatted_address ?? null,
    categoryLabel: landmarkCategoryLabel(name),
    provider: "google_places",
    providerLabel: "Google Places",
    mapsUrl,
    cuisineHint: null,
    specialReasonKo: "명소로 찾았어요",
    virtualCandidate: true,
  };
}
