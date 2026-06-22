import type { EventCandidate } from "@/lib/events/event-candidate";
import { mergeExifAutoPinOntoEvent } from "@/lib/globe/exif-auto-pin-metadata";
import type { MediaSpacetimeContext } from "@/lib/location-ping/types";

/** Globe photo/video commit — durable context + coords for map pin. */
export function stampDurableGlobePhotoEvent(
  event: EventCandidate,
  context: MediaSpacetimeContext,
  input?: {
    anchorLat?: number | null;
    anchorLng?: number | null;
    placeLabel?: string | null;
  },
): EventCandidate {
  const label =
    context.placeLabel?.trim() ||
    input?.placeLabel?.trim() ||
    event.place?.trim() ||
    undefined;

  let patched = mergeExifAutoPinOntoEvent(
    label ? { ...event, place: label } : event,
    context,
  );

  const meta = patched.metadata ?? {};
  const hasPinCoords =
    typeof meta.globePlaceLat === "number" && typeof meta.globePlaceLng === "number";

  if (!hasPinCoords) {
    const lat = context.lat ?? input?.anchorLat ?? null;
    const lng = context.lng ?? input?.anchorLng ?? null;
    if (
      lat !== null &&
      lng !== null &&
      Number.isFinite(lat) &&
      Number.isFinite(lng)
    ) {
      patched = {
        ...patched,
        place: label || patched.place,
        metadata: {
          ...meta,
          globePlaceConfirmed: true,
          globePlaceLat: lat,
          globePlaceLng: lng,
          globePlaceCardLat: lat,
          globePlaceCardLng: lng,
          ...(label
            ? { globePlaceLabel: label, globePlaceCardLabel: label }
            : {}),
        },
      };
    }
  }

  return {
    ...patched,
    metadata: {
      ...(patched.metadata ?? {}),
      globeManualContext: true,
      feedCaptureDurable: true,
      targetingSource:
        patched.metadata?.targetingSource === "exif_auto_pin"
          ? "exif_auto_pin"
          : "globe_photo_confirm",
    },
  };
}
