import type { FeedCaptureFragment } from "@/lib/feed/feed-capture-types";
import { resolvePlaceCoordinates } from "@/lib/experience-graph/resolve-place-coordinates";
import { matchKoreaKnownPoi } from "@/lib/globe/korea-known-pois";
import { matchKoreaKnownPlace } from "@/lib/globe/korea-known-places";
import { parseGpsDwellClusterIdCoords } from "@/lib/globe/parse-gps-dwell-cluster-id";
import { normalizePlaceLabel } from "@/lib/globe/normalize-place-label";

export type ResolvedDwellSegmentPlace = {
  rawLabel: string;
  resolvedLabel: string;
  lat: number;
  lng: number;
  /** True when POI/city table matched the label. */
  geocoded: boolean;
};

function readFragmentCoords(fragment: FeedCaptureFragment): {
  lat: number;
  lng: number;
} | null {
  if (
    typeof fragment.lat === "number" &&
    typeof fragment.lng === "number" &&
    Number.isFinite(fragment.lat) &&
    Number.isFinite(fragment.lng)
  ) {
    return { lat: fragment.lat, lng: fragment.lng };
  }
  return parseGpsDwellClusterIdCoords(fragment.id);
}

function isCoordLabel(label: string): boolean {
  return label.includes("°");
}

/** Label + coords → display place for dwell confirm UI. */
export function resolveDwellSegmentPlace(
  fragment: FeedCaptureFragment,
  fallbackPlace?: string | null,
): ResolvedDwellSegmentPlace {
  const coords = readFragmentCoords(fragment);
  const raw =
    normalizePlaceLabel(fragment.placeLabel?.trim() || "") ||
    normalizePlaceLabel(fallbackPlace?.trim() || "") ||
    "이 위치";

  const poi = !isCoordLabel(raw) ? matchKoreaKnownPoi(raw) : null;
  if (poi) {
    return {
      rawLabel: raw,
      resolvedLabel: poi.label,
      lat: coords?.lat ?? poi.lat,
      lng: coords?.lng ?? poi.lng,
      geocoded: true,
    };
  }

  const city = !isCoordLabel(raw) ? matchKoreaKnownPlace(raw) : null;
  if (city) {
    return {
      rawLabel: raw,
      resolvedLabel: city.label,
      lat: coords?.lat ?? city.lat,
      lng: coords?.lng ?? city.lng,
      geocoded: true,
    };
  }

  if (!isCoordLabel(raw)) {
    const resolved = resolvePlaceCoordinates(raw);
    if (resolved.label !== "한국" || raw.length <= 6) {
      return {
        rawLabel: raw,
        resolvedLabel: resolved.label,
        lat: coords?.lat ?? resolved.lat,
        lng: coords?.lng ?? resolved.lng,
        geocoded: resolved.label !== raw,
      };
    }
  }

  if (coords) {
    return {
      rawLabel: raw,
      resolvedLabel: raw,
      lat: coords.lat,
      lng: coords.lng,
      geocoded: false,
    };
  }

  const fallback = resolvePlaceCoordinates(raw);
  return {
    rawLabel: raw,
    resolvedLabel: raw,
    lat: fallback.lat,
    lng: fallback.lng,
    geocoded: false,
  };
}
