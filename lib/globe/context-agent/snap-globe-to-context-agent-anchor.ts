import type { RefObject } from "react";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
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
