/**
 * Slice B — post-scout Distance Gate (Spatial correctness).
 * After Target Scout, drop candidates outside Anchor radius.
 * @see assertSpatialAnchorResolved (Slice A) · docs/RIMVIO_REALITY_ANCHOR_PROJECTION.md
 */

import { haversineKm } from "@/lib/feed/spacetime-fit";

/** Default near radius when Patch does not specify meters (station/landmark near). */
export const DEFAULT_NEAR_RADIUS_METERS = 800;

export type DistanceGateAnchor = {
  readonly lat: number;
  readonly lng: number;
  readonly labelKo?: string | null;
};

export type DistanceGatable = {
  readonly id?: string | null;
  readonly labelKo?: string | null;
  readonly lat?: number | null;
  readonly lng?: number | null;
};

export type DistanceGateResult<T extends DistanceGatable> = {
  readonly kept: readonly T[];
  readonly dropped: readonly T[];
  readonly radiusMeters: number;
  readonly keptCount: number;
  readonly droppedCount: number;
  /** One-line status when all dropped or partial filter applied. */
  readonly statusKo: string | null;
};

export function resolveNearRadiusMeters(input: {
  readonly patchMeters?: number | null;
  readonly fallbackMeters?: number | null;
}): number {
  const fromPatch = input.patchMeters;
  if (
    typeof fromPatch === "number" &&
    Number.isFinite(fromPatch) &&
    fromPatch > 0
  ) {
    return Math.round(fromPatch);
  }
  const fallback = input.fallbackMeters;
  if (
    typeof fallback === "number" &&
    Number.isFinite(fallback) &&
    fallback > 0
  ) {
    return Math.round(fallback);
  }
  return DEFAULT_NEAR_RADIUS_METERS;
}

export function metersBetween(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  return haversineKm(aLat, aLng, bLat, bLng) * 1000;
}

/**
 * Hard gate: keep candidates with finite coords within radiusMeters of Anchor.
 * Missing coords → drop (cannot prove near).
 */
export function distanceGateNearScout<T extends DistanceGatable>(input: {
  readonly anchor: DistanceGateAnchor;
  readonly candidates: readonly T[];
  readonly radiusMeters?: number | null;
  readonly patchMeters?: number | null;
}): DistanceGateResult<T> {
  const radiusMeters = resolveNearRadiusMeters({
    patchMeters: input.patchMeters ?? input.radiusMeters,
  });
  const kept: T[] = [];
  const dropped: T[] = [];

  for (const c of input.candidates) {
    const lat = c.lat;
    const lng = c.lng;
    if (
      lat == null ||
      lng == null ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      dropped.push(c);
      continue;
    }
    const m = metersBetween(input.anchor.lat, input.anchor.lng, lat, lng);
    if (m <= radiusMeters) kept.push(c);
    else dropped.push(c);
  }

  const label = input.anchor.labelKo?.trim() || "기준점";
  let statusKo: string | null = null;
  if (input.candidates.length > 0 && kept.length === 0) {
    statusKo = `${label} ${radiusMeters}m 안쪽에 맞는 곳이 없어요`;
  } else if (dropped.length > 0 && kept.length > 0) {
    statusKo = `${label} ${radiusMeters}m · ${kept.length}곳 (${dropped.length}곳 제외)`;
  }

  return {
    kept,
    dropped,
    radiusMeters,
    keptCount: kept.length,
    droppedCount: dropped.length,
    statusKo,
  };
}
