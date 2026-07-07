import type { GlobeProjectionLayerPolicy } from "@/lib/globe/spatial-semantic/globe-projection-layer-policy";

function placeIdFromContextConditionMarkerId(markerId: string): string | null {
  const parts = markerId.trim().split(":");
  return parts.length > 0 ? parts[parts.length - 1]!.trim() || null : null;
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
    return [];
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
