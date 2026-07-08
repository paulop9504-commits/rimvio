import type { RefObject } from "react";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { computeLodgingDiscoveryBounds } from "@/lib/globe/lodging/compute-lodging-discovery-bounds";
import { MAP_FOCUS_PIN_VIEWPORT_Y } from "@/lib/globe/map-anchored-overlay-layout";

/** 1:1 context assistant — street-scale, pin biased for chat frame. */
export const CONTEXT_AGENT_GLOBE_DETAIL_LEVEL = "street" as const;

export function snapGlobeToContextAgentAnchor(
  globeRef: RefObject<RimvioGlobeHubHandle | null>,
  input: { lat: number; lng: number },
): void {
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
    return;
  }
  globeRef.current?.snapToPin(input.lat, input.lng, CONTEXT_AGENT_GLOBE_DETAIL_LEVEL, {
    pinViewportY: MAP_FOCUS_PIN_VIEWPORT_Y,
  });
}

/** Scout complete — fit all result pins on map (no fly animation). */
export function snapGlobeToContextConditionScout(
  globeRef: RefObject<RimvioGlobeHubHandle | null>,
  input: {
    anchorLat: number;
    anchorLng: number;
    recommendations: readonly { lat: number; lng: number }[];
    radiusM?: number;
  },
): void {
  if (input.recommendations.length === 1) {
    const single = input.recommendations[0]!;
    snapGlobeToContextAgentAnchor(globeRef, {
      lat: single.lat,
      lng: single.lng,
    });
    return;
  }
  const bounds = computeLodgingDiscoveryBounds({
    user: { lat: input.anchorLat, lng: input.anchorLng },
    lodging: input.recommendations,
    radiusM: input.radiusM,
  });
  if (!bounds) {
    snapGlobeToContextAgentAnchor(globeRef, {
      lat: input.anchorLat,
      lng: input.anchorLng,
    });
    return;
  }
  globeRef.current?.snapToDiscoveryBounds({
    centerLat: bounds.centerLat,
    centerLng: bounds.centerLng,
    altitude: bounds.altitude,
    pinViewportY: MAP_FOCUS_PIN_VIEWPORT_Y,
  });
}
