import {
  Client,
  Language,
} from "@googlemaps/google-maps-services-js";
import {
  resolveGoogleLodgingPhotoBundle,
} from "@/lib/globe/lodging/lodging-photo-fidelity";
import { googlePlacesApiKey, isGooglePlacesConfigured } from "@/lib/locate/google-places-config";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import { buildGoogleMapsPlaceHref } from "@/lib/resolvers/deep-links";

const client = new Client({});

const LODGING_SEARCH_RADIUS_M = 8_000;
const DEFAULT_MAX_RESULTS = 5;

function priceKrwFromGoogleLevel(level: number | undefined): number | null {
  if (level == null || !Number.isFinite(level)) {
    return null;
  }
  const table: Record<number, number> = {
    0: 0,
    1: 55_000,
    2: 85_000,
    3: 130_000,
    4: 190_000,
  };
  return table[level] ?? null;
}

function buildPlacePhotoUrl(photoReference: string, key: string): string {
  const params = new URLSearchParams({
    maxwidth: "640",
    photo_reference: photoReference,
    key,
  });
  return `https://maps.googleapis.com/maps/api/place/photo?${params.toString()}`;
}

async function readLodgingDetails(input: {
  placeId: string;
  key: string;
}): Promise<{
  placeId: string | null;
  name: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  mapsUrl: string | null;
  photoUrls: string[];
}> {
  try {
    const response = await client.placeDetails({
      params: {
        place_id: input.placeId,
        fields: ["formatted_address", "geometry", "name", "photo", "place_id", "url"],
        language: Language.ko,
        key: input.key,
      },
    });
    const result = response.data.result;
    if (!result) {
      return {
        placeId: null,
        name: null,
        lat: null,
        lng: null,
        address: null,
        mapsUrl: null,
        photoUrls: [],
      };
    }
    const lat = result.geometry?.location?.lat;
    const lng = result.geometry?.location?.lng;
    const placeId = result.place_id?.trim() ?? null;
    const name = result.name?.trim() ?? null;
    const resolvedLat =
      typeof lat === "number" && Number.isFinite(lat) ? lat : null;
    const resolvedLng =
      typeof lng === "number" && Number.isFinite(lng) ? lng : null;
    return {
      placeId,
      name,
      lat: resolvedLat,
      lng: resolvedLng,
      address: result.formatted_address?.trim() ?? null,
      mapsUrl:
        placeId && resolvedLat != null && resolvedLng != null
          ? buildGoogleMapsPlaceHref({
              lat: resolvedLat,
              lng: resolvedLng,
              placeId,
              placeLabel: name,
            })
          : result.url?.trim() ?? null,
      photoUrls: (result.photos ?? [])
        .map((photo) => photo.photo_reference)
        .filter((photoReference): photoReference is string => Boolean(photoReference?.trim()))
        .slice(0, 4)
        .map((photoReference) => buildPlacePhotoUrl(photoReference, input.key)),
    };
  } catch {
    return {
      placeId: null,
      name: null,
      lat: null,
      lng: null,
      address: null,
      mapsUrl: null,
      photoUrls: [],
    };
  }
}

export type FetchPlacesLodgingNearbyInput = {
  lat: number;
  lng: number;
  maxResults?: number;
};

/** Google Places Nearby (lodging) — server-side only. */
export async function fetchPlacesLodgingNearby(
  input: FetchPlacesLodgingNearbyInput,
): Promise<ContextLodgingInventoryRow[]> {
  if (!isGooglePlacesConfigured()) {
    return [];
  }

  const key = googlePlacesApiKey();
  if (!key) {
    return [];
  }

  const maxResults = input.maxResults ?? DEFAULT_MAX_RESULTS;

  try {
    const response = await client.placesNearby({
      params: {
        location: { lat: input.lat, lng: input.lng },
        radius: LODGING_SEARCH_RADIUS_M,
        type: "lodging",
        language: Language.ko,
        key,
      },
    });

    const candidates = (response.data.results ?? [])
      .map((result) => {
        const lat = result.geometry?.location?.lat;
        const lng = result.geometry?.location?.lng;
        const placeId = result.place_id?.trim();
        const name = result.name?.trim();
        if (
          lat == null ||
          lng == null ||
          !Number.isFinite(lat) ||
          !Number.isFinite(lng) ||
          !placeId ||
          !name
        ) {
          return null;
        }
        return {
          placeId,
          name,
          lat,
          lng,
          priceKrw: priceKrwFromGoogleLevel(result.price_level),
          partnerLabel: "google_places",
          images: [] as string[],
          address: result.vicinity?.trim() ?? null,
          mapsUrl: buildGoogleMapsPlaceHref({
            lat,
            lng,
            placeId,
            placeLabel: name,
          }),
          provider: "google_places" as const,
          videoUrl: null,
          photoSource: null,
          photoConfidence: null,
        } as ContextLodgingInventoryRow;
      })
      .filter((row): row is ContextLodgingInventoryRow => row !== null)
      .slice(0, maxResults);

    if (candidates.length === 0) {
      return [];
    }

    const withPhotos = await Promise.all(
      candidates.map(async (row) => {
        const nearbyPhotoReference = response.data.results
          ?.find((result) => result.place_id?.trim() === row.placeId)
          ?.photos?.[0]?.photo_reference;
        const details = await readLodgingDetails({
          placeId: row.placeId,
          key,
        });
        const photo = resolveGoogleLodgingPhotoBundle({
          nearby: {
            placeId: row.placeId,
            name: row.name,
            lat: row.lat,
            lng: row.lng,
            address: row.address ?? null,
            mapsUrl: row.mapsUrl ?? null,
            nearbyPhotoUrls: nearbyPhotoReference
              ? [buildPlacePhotoUrl(nearbyPhotoReference, key)]
              : [],
          },
          details,
        });
        return {
          ...row,
          images: photo.images,
          address: photo.address,
          mapsUrl: photo.mapsUrl,
          photoSource: photo.photoSource,
          photoConfidence: photo.photoConfidence,
        };
      }),
    );

    return withPhotos;
  } catch {
    return [];
  }
}
