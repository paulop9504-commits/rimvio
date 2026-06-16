import type { EventCandidate } from "@/lib/events/event-candidate";

function readFiniteCoord(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Context anchor for lodging Nearby Search — destination first, GPS when syncing near place. */
export function resolveContextLodgingSearchCoords(
  event: EventCandidate,
  input?: {
    lat?: number | null;
    lng?: number | null;
    preferUserLocation?: boolean;
  },
): { lat: number; lng: number } | null {
  const meta = event.metadata ?? {};
  const eventLat = readFiniteCoord(meta.globePlaceLat);
  const eventLng = readFiniteCoord(meta.globePlaceLng);
  const userLat = input?.lat ?? null;
  const userLng = input?.lng ?? null;

  if (input?.preferUserLocation && userLat != null && userLng != null) {
    return { lat: userLat, lng: userLng };
  }

  if (eventLat != null && eventLng != null) {
    return { lat: eventLat, lng: eventLng };
  }

  if (userLat != null && userLng != null) {
    return { lat: userLat, lng: userLng };
  }

  return null;
}
