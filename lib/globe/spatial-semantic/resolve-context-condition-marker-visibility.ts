import type { GlobeProjectionLayerPolicy } from "@/lib/globe/spatial-semantic/globe-projection-layer-policy";
import { shouldProjectMapResultsToGlobe } from "@/lib/context-workspace/should-project-lodging-to-globe";

function placeIdFromContextConditionMarkerId(markerId: string): string | null {
  const parts = markerId.trim().split(":");
  return parts.length > 0 ? parts[parts.length - 1]!.trim() || null : null;
}

function placeIdFromHubResourceId(resourceId: string): string | null {
  const lodging = resourceId.lastIndexOf(":lodging:");
  if (lodging >= 0) {
    return resourceId.slice(lodging + ":lodging:".length).trim() || null;
  }
  const activity = resourceId.lastIndexOf(":activity:");
  if (activity >= 0) {
    return resourceId.slice(activity + ":activity:".length).trim() || null;
  }
  const amenity = resourceId.lastIndexOf(":amenity:");
  if (amenity >= 0) {
    return resourceId.slice(amenity + ":amenity:".length).trim() || null;
  }
  const eatery = resourceId.lastIndexOf(":eatery:");
  if (eatery >= 0) {
    return resourceId.slice(eatery + ":eatery:".length).trim() || null;
  }
  return null;
}

/** Hub discovery markers — hide clutter when chat/scout focuses the map. */
export function filterHubMarkersByProjectionPolicy<
  T extends { resourceId: string; projectionTier?: string },
>(input: {
  markers: readonly T[];
  policy: GlobeProjectionLayerPolicy;
  contextEventId: string;
}): T[] {
  const activeId = input.policy.activeContextEventId?.trim();
  const contextId = input.contextEventId.trim();
  if (!activeId || activeId !== contextId) {
    return [...input.markers];
  }
  if (input.policy.mode === "context_only") {
    // Context workspace: keep Reality Object foreground only (hierarchical projection).
    const foreground = input.markers.filter(
      (marker) => marker.projectionTier !== "background",
    );
    if (foreground.some((marker) => marker.projectionTier === "foreground")) {
      return foreground.filter(
        (marker) => marker.projectionTier === "foreground",
      );
    }
    return [];
  }
  if (input.policy.mode !== "focus") {
    return [...input.markers];
  }
  const visible = new Set(
    input.policy.visiblePlaceIds.map((placeId) => placeId.trim()).filter(Boolean),
  );
  if (visible.size === 0) {
    return [];
  }
  return input.markers.filter((marker) => {
    const placeId = placeIdFromHubResourceId(marker.resourceId);
    return placeId ? visible.has(placeId) : false;
  });
}

/** Hub discovery pills — hidden when folded; subset when focus. */
export function shouldProjectContextConditionMarkers(
  policy: GlobeProjectionLayerPolicy,
  contextEventId: string,
): boolean {
  const activeId = policy.activeContextEventId?.trim();
  if (!activeId || activeId !== contextEventId.trim()) {
    return false;
  }
  // Provisional Context Workspace owns map edit — hide Globe scout pills.
  if (!shouldProjectMapResultsToGlobe(contextEventId)) {
    return false;
  }
  return policy.mode === "focus";
}

export function filterContextConditionMarkersByPlaceIds<
  T extends { id: string },
>(markers: readonly T[], policy: GlobeProjectionLayerPolicy): T[] {
  if (policy.mode !== "focus") {
    return [];
  }
  const visible = new Set(
    policy.visiblePlaceIds.map((placeId) => placeId.trim()).filter(Boolean),
  );
  if (visible.size === 0) {
    return [...markers];
  }
  return markers.filter((marker) => {
    const placeId = placeIdFromContextConditionMarkerId(marker.id);
    return placeId ? visible.has(placeId) : false;
  });
}

/** Scout radius ring removed — sparse map pins only. */
export function shouldShowContextConditionDiscoveryOverlay(
  _policy: GlobeProjectionLayerPolicy,
  _contextEventId: string | null | undefined,
): boolean {
  return false;
}
