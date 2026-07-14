import { NextResponse, type NextRequest } from "next/server";
import {
  Client,
  Language,
  PlaceInputType,
} from "@googlemaps/google-maps-services-js";
import { googlePlacesApiKey, isGooglePlacesConfigured } from "@/lib/locate/google-places-config";
import { fetchAttractionPhotoUrls } from "@/lib/places/fetch-attraction-photo-urls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = new Client({});

function buildPlacePhotoUrl(photoReference: string, key: string): string {
  const params = new URLSearchParams({
    maxwidth: "800",
    photo_reference: photoReference,
    key,
  });
  return `https://maps.googleapis.com/maps/api/place/photo?${params.toString()}`;
}

function parseCoord(value: string | null): number | null {
  if (!value?.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Hydrate attraction / landmark media for activity feed cards. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const name = params.get("name")?.trim() ?? "";
  const placeId = params.get("placeId")?.trim() ?? "";
  const lat = parseCoord(params.get("lat"));
  const lng = parseCoord(params.get("lng"));
  const anchor = params.get("anchor")?.trim() || null;

  if (!name) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }

  const images: string[] = [];
  const seen = new Set<string>();
  const push = (url: string | null | undefined) => {
    const trimmed = url?.trim();
    if (!trimmed || seen.has(trimmed)) {
      return;
    }
    seen.add(trimmed);
    images.push(trimmed);
  };

  const key = googlePlacesApiKey();
  if (isGooglePlacesConfigured() && key) {
    try {
      const looksLikeGooglePlaceId =
        Boolean(placeId) &&
        !placeId.startsWith("landmark:") &&
        !placeId.includes("http") &&
        !placeId.includes("maps");

      let resolvedPlaceId = looksLikeGooglePlaceId ? placeId : "";

      if (!resolvedPlaceId) {
        const findParams: Parameters<typeof client.findPlaceFromText>[0]["params"] = {
          input: name,
          inputtype: PlaceInputType.textQuery,
          fields: ["place_id", "photos", "name"],
          language: Language.ko,
          key,
        };
        if (lat != null && lng != null) {
          findParams.locationbias = `circle:50000@${lat},${lng}`;
        }
        const found = await client.findPlaceFromText({ params: findParams });
        const candidate = found.data.candidates?.[0];
        if (candidate?.place_id) {
          resolvedPlaceId = candidate.place_id;
        }
        for (const photo of candidate?.photos ?? []) {
          if (photo.photo_reference) {
            push(buildPlacePhotoUrl(photo.photo_reference, key));
          }
        }
      }

      if (resolvedPlaceId && images.length < 4) {
        const details = await client.placeDetails({
          params: {
            place_id: resolvedPlaceId,
            fields: ["photos", "name"],
            language: Language.ko,
            key,
          },
        });
        for (const photo of details.data.result?.photos ?? []) {
          if (photo.photo_reference) {
            push(buildPlacePhotoUrl(photo.photo_reference, key));
          }
        }
      }
    } catch {
      // fall through to Naver / CSE
    }
  }

  if (images.length < 3) {
    const extra = await fetchAttractionPhotoUrls({ name, anchor });
    for (const url of extra) {
      push(url);
      if (images.length >= 8) {
        break;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    images: images.slice(0, 8),
  });
}
