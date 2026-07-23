import type { RefObject } from "react";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { computeLodgingDiscoveryBounds } from "@/lib/globe/lodging/compute-lodging-discovery-bounds";
import { GLOBE_ALTITUDE } from "@/lib/globe/globe-zoom-levels";
import { MAP_FOCUS_PIN_VIEWPORT_Y } from "@/lib/globe/map-anchored-overlay-layout";
import { readSessionGraph } from "@/lib/graph-command/session-graph-store";

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

/** Lens spawn — frame all POV rings so the map confirms the choice immediately. */
export function flyGlobeToDiscoveryLenses(
  globeRef: RefObject<RimvioGlobeHubHandle | null> | null | undefined,
  input: {
    lenses: readonly { center: { lat: number; lng: number }; radiusM: number }[];
  },
): void {
  if (!globeRef || input.lenses.length === 0) {
    return;
  }
  const points = input.lenses.map((lens) => ({
    lat: lens.center.lat,
    lng: lens.center.lng,
  }));
  const maxRadiusM = Math.max(...input.lenses.map((lens) => lens.radiusM), 1500);
  const bounds = computeLodgingDiscoveryBounds({
    user: null,
    lodging: points,
    radiusM: maxRadiusM,
  });
  if (!bounds) {
    const first = points[0]!;
    globeRef.current?.flyToPin(first.lat, first.lng, "city", {
      pinViewportY: MAP_FOCUS_PIN_VIEWPORT_Y,
    });
    return;
  }
  globeRef.current?.flyToDiscoveryBounds({
    centerLat: bounds.centerLat,
    centerLng: bounds.centerLng,
    altitude: bounds.altitude,
    pinViewportY: MAP_FOCUS_PIN_VIEWPORT_Y,
  });
}

/**
 * After Graph Command search_project — frame Diff place pins so chat copy
 * ("지도에 N곳을 펼쳤어요") matches the map while the assistant panel is open.
 */
export function flyGlobeToSessionGraphDiff(
  globeRef: RefObject<RimvioGlobeHubHandle | null> | null | undefined,
  contextEventId: string,
): void {
  if (!globeRef) {
    return;
  }
  const graph = readSessionGraph(contextEventId);
  if (!graph) {
    return;
  }
  const places = graph.nodes.filter(
    (node): node is typeof node & { lat: number; lng: number } =>
      node.visible &&
      node.kind !== "compare" &&
      node.kind !== "simulation" &&
      typeof node.lat === "number" &&
      typeof node.lng === "number" &&
      Number.isFinite(node.lat) &&
      Number.isFinite(node.lng),
  );
  if (places.length === 0) {
    return;
  }
  snapGlobeToContextConditionScout(globeRef, {
    anchorLat: graph.anchorLat ?? places[0]!.lat,
    anchorLng: graph.anchorLng ?? places[0]!.lng,
    recommendations: places.map((node) => ({ lat: node.lat, lng: node.lng })),
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
    // Never leave lodging pins invisible behind a region/space altitude.
    altitude: Math.min(bounds.altitude, GLOBE_ALTITUDE.city),
    pinViewportY: MAP_FOCUS_PIN_VIEWPORT_Y,
  });
}
