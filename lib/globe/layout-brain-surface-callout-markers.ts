import type { BrainSurfaceProjectionCandidate } from "@/lib/situation-projection/brain-surface-types";

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const BASE_RADIUS_PX = 84;
const RADIUS_STEP_PX = 54;

export type BrainSurfaceCalloutOffset = {
  x: number;
  y: number;
};

/** Sunflower fan — pill offsets in px from shared hub anchor. */
export function resolveBrainSurfaceCalloutOffset(
  index: number,
  total: number,
): BrainSurfaceCalloutOffset {
  if (total <= 1) {
    return { x: 0, y: -72 };
  }
  const angle = index * GOLDEN_ANGLE - Math.PI / 2;
  const ring = Math.floor(Math.sqrt(index));
  const radiusPx = BASE_RADIUS_PX + ring * RADIUS_STEP_PX;
  return {
    x: Math.round(Math.cos(angle) * radiusPx),
    y: Math.round(Math.sin(angle) * radiusPx),
  };
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
