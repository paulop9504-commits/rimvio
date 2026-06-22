import type { MediaSpacetimeContext } from "@/lib/location-ping/types";

const GPS_RESOLVE_SOURCES = new Set<MediaSpacetimeContext["resolveSource"]>([
  "exif_gps",
  "gps_ping",
  "last_known_ping",
]);

/** True when capture has embedded GPS — travel route auto-pin stays enabled. */
export function hasExifGpsCapture(context: MediaSpacetimeContext): boolean {
  return context.resolveSource === "exif_gps";
}

/** EXIF or live GPS — skip media pool staging. */
export function hasCaptureGps(context: MediaSpacetimeContext): boolean {
  if (!GPS_RESOLVE_SOURCES.has(context.resolveSource)) {
    return false;
  }
  const lat = context.lat;
  const lng = context.lng;
  return (
    lat !== null &&
    lng !== null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
}

/**
 * GPS-less screenshots / edited photos — stage to pool instead of auto moment.
 * Pin-card uploads (`forceAttachToHint`) and walkthrough confirm bypass the pool.
 */
export function shouldStageMediaToPool(input: {
  context: MediaSpacetimeContext;
  forceAttachToHint?: boolean;
  /** Bulk cluster inferred place — skip pool staging. */
  bulkClusterPlaceLabel?: string | null;
  bypassPool?: boolean;
  userConfirmedContext?: boolean;
}): boolean {
  if (input.forceAttachToHint) {
    return false;
  }
  if (input.bypassPool === true) {
    return false;
  }
  if (input.userConfirmedContext === true) {
    return false;
  }
  if (input.bulkClusterPlaceLabel?.trim()) {
    return false;
  }
  if (input.context.poolStatus === "staged") {
    return false;
  }
  return !hasCaptureGps(input.context);
}
