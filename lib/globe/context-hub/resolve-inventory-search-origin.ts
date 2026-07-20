import { buildContextInstance } from "@/lib/context-instance/build-context-instance";
import type { EventCandidate } from "@/lib/events/event-candidate";

/**
 * Inventory Nearby Search origin — same gate as lodging/discovery coords.
 * Viewer GPS must not hijack overseas context (25 km anchor rule in ContextInstance).
 */
export function resolveInventorySearchOrigin(input: {
  event: EventCandidate;
  lat?: number | null;
  lng?: number | null;
  preferUserLocation?: boolean;
  message?: string | null;
}): { lat: number; lng: number } | null {
  const context = buildContextInstance({
    event: input.event,
    message: input.message,
    lat: input.lat,
    lng: input.lng,
    preferUserLocation: input.preferUserLocation,
  });
  return context.location.searchOrigin;
}
