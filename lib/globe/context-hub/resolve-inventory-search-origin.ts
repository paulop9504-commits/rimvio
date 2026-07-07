import { buildContextInstance } from "@/lib/context-instance/build-context-instance";
import type { EventCandidate } from "@/lib/events/event-candidate";

function readFiniteCoord(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Pin anchor wins for discovery — viewer GPS must not hijack overseas context. */
export function resolveInventorySearchOrigin(input: {
  event: EventCandidate;
  lat?: number | null;
  lng?: number | null;
  preferUserLocation?: boolean;
  message?: string | null;
}): { lat: number; lng: number } | null {
  const pinLat = readFiniteCoord(input.lat);
  const pinLng = readFiniteCoord(input.lng);
  if (pinLat != null && pinLng != null) {
    return { lat: pinLat, lng: pinLng };
  }

  const context = buildContextInstance({
    event: input.event,
    message: input.message,
    lat: input.lat,
    lng: input.lng,
    preferUserLocation: input.preferUserLocation,
  });
  return context.location.searchOrigin;
}
