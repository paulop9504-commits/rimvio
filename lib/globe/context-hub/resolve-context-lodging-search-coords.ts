import {
  buildContextInstance,
  resolveStableContextPlaceAnchor,
} from "@/lib/context-instance/build-context-instance";
import type { EventCandidate } from "@/lib/events/event-candidate";

/** Destination anchor for lodging — context pin / place geocode, not viewer GPS. */
export function resolveContextLodgingDestinationAnchor(
  event: EventCandidate,
): { lat: number; lng: number } {
  const anchor = resolveStableContextPlaceAnchor(event);
  return { lat: anchor.lat, lng: anchor.lng };
}

export function shouldPreferUserLocationForLodgingSync(input: {
  event: EventCandidate;
  lat?: number | null;
  lng?: number | null;
}): boolean {
  return buildContextInstance({
    event: input.event,
    lat: input.lat,
    lng: input.lng,
    preferUserLocation: true,
  }).movement.shouldPreferUserCoords;
}

/** Context anchor for lodging Nearby Search — destination first; GPS only when near place. */
export function resolveContextLodgingSearchCoords(
  event: EventCandidate,
  input?: {
    lat?: number | null;
    lng?: number | null;
    preferUserLocation?: boolean;
  },
): { lat: number; lng: number } | null {
  const context = buildContextInstance({
    event,
    lat: input?.lat,
    lng: input?.lng,
    preferUserLocation: input?.preferUserLocation,
  });
  if (!context.location.searchOrigin) {
    return null;
  }
  return {
    lat: context.location.searchOrigin.lat,
    lng: context.location.searchOrigin.lng,
  };
}
