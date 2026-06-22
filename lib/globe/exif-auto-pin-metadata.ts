import type { MediaSpacetimeContext } from "@/lib/location-ping/types";

export const EXIF_AUTO_PINNED_META_KEY = "exifAutoPinned";

const GPS_PIN_SOURCES = new Set<MediaSpacetimeContext["resolveSource"]>([
  "exif_gps",
  "gps_ping",
  "last_known_ping",
]);

function readGpsCoords(context: MediaSpacetimeContext): { lat: number; lng: number } | null {
  const lat = context.lat;
  const lng = context.lng;
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return { lat, lng };
}

/** Stamp GPS coords on event metadata — map pin lands on capture coords. */
export function buildGpsPinMetadataFromContext(
  context: MediaSpacetimeContext,
): Record<string, unknown> | null {
  if (!GPS_PIN_SOURCES.has(context.resolveSource)) {
    return null;
  }
  const coords = readGpsCoords(context);
  if (!coords) {
    return null;
  }

  const label = context.placeLabel?.trim() || undefined;
  const exif = context.resolveSource === "exif_gps";

  return {
    [EXIF_AUTO_PINNED_META_KEY]: exif,
    targetingSource: exif ? "exif_auto_pin" : "globe_photo_confirm",
    globePlaceConfirmed: true,
    globePlaceLat: coords.lat,
    globePlaceLng: coords.lng,
    ...(label ? { globePlaceLabel: label, globePlaceCardLabel: label } : {}),
    globePlaceCardLat: coords.lat,
    globePlaceCardLng: coords.lng,
  };
}

/** Stamp EXIF GPS on event metadata — map pin lands on capture coords. */
export function buildExifAutoPinMetadata(
  context: MediaSpacetimeContext,
): Record<string, unknown> | null {
  if (context.resolveSource !== "exif_gps") {
    return null;
  }
  return buildGpsPinMetadataFromContext(context);
}

export function mergeExifAutoPinOntoEvent<T extends { metadata?: Record<string, unknown>; place?: string }>(
  event: T,
  context: MediaSpacetimeContext,
): T {
  const patch = buildGpsPinMetadataFromContext(context);
  if (!patch) {
    return event;
  }
  const label = context.placeLabel?.trim();
  return {
    ...event,
    place: label || event.place,
    metadata: {
      ...(event.metadata ?? {}),
      ...patch,
    },
  };
}
