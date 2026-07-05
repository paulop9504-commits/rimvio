import type { BrainSurfaceProjectionCandidate } from "@/lib/situation-projection/brain-surface-types";
import { resolveNonOverlappingCalloutOffset } from "@/lib/globe/resolve-non-overlapping-callout-offsets";

export type BrainSurfaceCalloutOffset = {
  x: number;
  y: number;
};

/** Compass + collision-aware pill offsets in px from shared hub anchor. */
export function resolveBrainSurfaceCalloutOffset(
  index: number,
  total: number,
): BrainSurfaceCalloutOffset {
  return resolveNonOverlappingCalloutOffset(index, total);
}

/** Collapse overlapping brain markers to hub with radial callout stems. */
export function layoutBrainSurfaceCalloutMarkers(input: {
  candidates: readonly BrainSurfaceProjectionCandidate[];
  hubLat: number;
  hubLng: number;
}): BrainSurfaceProjectionCandidate[] {
  const hubLat = input.hubLat;
  const hubLng = input.hubLng;
  if (!Number.isFinite(hubLat) || !Number.isFinite(hubLng)) {
    return [...input.candidates];
  }

  const sorted = [...input.candidates].sort(
    (left, right) =>
      (right.focusPriority ?? 0) - (left.focusPriority ?? 0) ||
      left.revealOrder - right.revealOrder,
  );

  if (sorted.length <= 1) {
    return sorted.map((candidate) => ({
      ...candidate,
      lat: hubLat,
      lng: hubLng,
      calloutOffsetX: 0,
      calloutOffsetY: -68,
    }));
  }

  return sorted.map((candidate, index) => {
    const offset = resolveBrainSurfaceCalloutOffset(index, sorted.length);
    return {
      ...candidate,
      lat: hubLat,
      lng: hubLng,
      calloutOffsetX: offset.x,
      calloutOffsetY: offset.y,
    };
  });
}
