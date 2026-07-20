/**
 * Video → map pin: play at the place the video is about, not viewer GPS.
 * Title / placeLabel / related place beat a distant hub (e.g. 오사카 clip over 서울).
 */

import { haversineKm } from "@/lib/feed/spacetime-fit";
import { resolveTripContextAnchor } from "@/lib/experience-run/resolve-trip-context-anchor";
import { CONTEXT_ANCHOR_NEAR_KM } from "@/lib/context-instance/build-context-instance";

export type VideoMapAnchor = {
  readonly lat: number;
  readonly lng: number;
  readonly placeLabel: string;
  readonly source: "explicit_place" | "title" | "fallback_coords";
};

function normalizeText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/gu, " ") ?? "";
}

/**
 * Prefer explicit destination in place/title (오사카, Osaka, …).
 * Falls back to provided coords only when no place can be resolved.
 */
export function resolveVideoMapAnchor(input: {
  title?: string | null;
  placeLabel?: string | null;
  relatedPlaceLabel?: string | null;
  lat?: number | null;
  lng?: number | null;
}): VideoMapAnchor | null {
  const placeSeeds = [
    input.placeLabel,
    input.relatedPlaceLabel,
    input.title,
  ]
    .map((value) => normalizeText(value))
    .filter(Boolean);

  for (const seed of placeSeeds) {
    const anchor = resolveTripContextAnchor(seed);
    if (anchor) {
      return {
        lat: anchor.lat,
        lng: anchor.lng,
        placeLabel: anchor.placeLabel,
        source: seed === normalizeText(input.title) ? "title" : "explicit_place",
      };
    }
  }

  const lat = input.lat;
  const lng = input.lng;
  if (
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  ) {
    return {
      lat,
      lng,
      placeLabel: placeSeeds[0] ?? "영상",
      source: "fallback_coords",
    };
  }

  return null;
}

/**
 * Hub (active pin / GPS) must not yank a video across cities.
 * Keep video at its own place when hub is farther than CONTEXT_ANCHOR_NEAR_KM.
 */
export function pickVideoPlaybackCoords(input: {
  videoLat: number;
  videoLng: number;
  hubLat?: number | null;
  hubLng?: number | null;
}): { lat: number; lng: number; usedHub: boolean } {
  const hubLat = input.hubLat;
  const hubLng = input.hubLng;
  if (
    hubLat == null ||
    hubLng == null ||
    !Number.isFinite(hubLat) ||
    !Number.isFinite(hubLng)
  ) {
    return { lat: input.videoLat, lng: input.videoLng, usedHub: false };
  }

  const distanceKm = haversineKm(
    input.videoLat,
    input.videoLng,
    hubLat,
    hubLng,
  );
  if (distanceKm > CONTEXT_ANCHOR_NEAR_KM) {
    return { lat: input.videoLat, lng: input.videoLng, usedHub: false };
  }

  return { lat: hubLat, lng: hubLng, usedHub: true };
}
