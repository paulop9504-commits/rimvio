import {
  buildContextInstance,
  resolveStableContextPlaceAnchor,
} from "@/lib/context-instance/build-context-instance";
import type { EventCandidate } from "@/lib/events/event-candidate";

function readFiniteCoord(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Map-focused discovery — cluster pin first, then stable context anchor. */
export function resolveContextDiscoverySearchCoords(
  event: EventCandidate,
  input?: {
    pinLat?: number | null;
    pinLng?: number | null;
    viewerLat?: number | null;
    viewerLng?: number | null;
  },
): { lat: number; lng: number } {
  const pinLat = readFiniteCoord(input?.pinLat);
  const pinLng = readFiniteCoord(input?.pinLng);
  if (pinLat != null && pinLng != null) {
    return { lat: pinLat, lng: pinLng };
  }

  const anchor = resolveStableContextPlaceAnchor(event);
  const context = buildContextInstance({
    event,
    lat: input?.viewerLat,
    lng: input?.viewerLng,
    preferUserLocation: true,
    surface: "composer",
    layerMode: "discovery",
  });

  return (
    context.location.searchOrigin ?? {
      lat: anchor.lat,
      lng: anchor.lng,
    }
  );
}
