/**
 * SpatialPlan resolution — read-only helpers for L3/L4.
 * Does not mutate Blueprint. Does not execute domain logic.
 */

import { haversineKm } from "@/lib/feed/spacetime-fit";
import type {
  ExecutionAnchor,
  ExecutionSpace,
  ExecutionZone,
} from "@/lib/context-blueprint/spatial-plan";
import {
  hasUnresolvedExecutionSpaceSlots,
  listExecutionAnchors,
  readUnresolvedExecutionSpaceSlots,
} from "@/lib/context-blueprint/spatial-plan";
import type { ExecutionSpaceSlot } from "@/lib/context-blueprint/execution-space-slots";

export type ExecutionAnchorResolution = {
  readonly currentAnchor: ExecutionAnchor | null;
  readonly nextActiveAnchor: ExecutionAnchor | null;
  readonly currentZone: ExecutionZone | null;
  readonly pathIndex: number;
  readonly unresolvedSlots: readonly ExecutionSpaceSlot[];
  readonly hasUnresolvedSlots: boolean;
};

/** @deprecated Use ExecutionAnchorResolution */
export type SpatialAnchorResolution = ExecutionAnchorResolution;

function readAnchorCoords(
  anchor: ExecutionAnchor,
): { lat: number; lng: number } | null {
  if (
    anchor.lat == null ||
    anchor.lng == null ||
    !Number.isFinite(anchor.lat) ||
    !Number.isFinite(anchor.lng)
  ) {
    return null;
  }
  return { lat: anchor.lat, lng: anchor.lng };
}

function resolveNearestAnchor(input: {
  space: ExecutionSpace;
  lat: number;
  lng: number;
  maxKm?: number;
}): { anchor: ExecutionAnchor; distanceKm: number } | null {
  const maxKm = input.maxKm ?? 25;
  let best: { anchor: ExecutionAnchor; distanceKm: number } | null = null;
  for (const anchor of listExecutionAnchors(input.space)) {
    if (anchor.resolution === "unresolved") {
      continue;
    }
    const coords = readAnchorCoords(anchor);
    if (!coords) {
      continue;
    }
    const distanceKm = haversineKm(input.lat, input.lng, coords.lat, coords.lng);
    const triggerM = anchor.triggerRadiusM ?? 800;
    const triggerKm = triggerM / 1000;
    if (distanceKm > Math.max(triggerKm, maxKm)) {
      continue;
    }
    if (!best || distanceKm < best.distanceKm) {
      best = { anchor, distanceKm };
    }
  }
  return best;
}

function resolveZoneForAnchor(
  space: ExecutionSpace,
  anchor: ExecutionAnchor | null,
): ExecutionZone | null {
  if (!anchor?.zoneId) {
    return null;
  }
  return space.executionZones.find((zone) => zone.id === anchor.zoneId) ?? null;
}

/** L3/L4: user position → anchor context on Spatial Execution Graph. */
export function resolveExecutionSpaceContext(input: {
  space: ExecutionSpace;
  userLat?: number | null;
  userLng?: number | null;
}): ExecutionAnchorResolution {
  const anchors = listExecutionAnchors(input.space);
  const unresolvedSlots = readUnresolvedExecutionSpaceSlots(input.space);
  if (anchors.length === 0) {
    return {
      currentAnchor: null,
      nextActiveAnchor: null,
      currentZone: null,
      pathIndex: -1,
      unresolvedSlots,
      hasUnresolvedSlots: unresolvedSlots.length > 0,
    };
  }

  const lat = input.userLat;
  const lng = input.userLng;
  const nearest =
    lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
      ? resolveNearestAnchor({ space: input.space, lat, lng })
      : null;

  const currentAnchor = nearest?.anchor ?? null;
  const pathIndex = currentAnchor
    ? input.space.expectedPathAnchorIds.indexOf(currentAnchor.id)
    : -1;

  let nextActiveAnchor: ExecutionAnchor | null = null;
  if (pathIndex >= 0) {
    const nextId = input.space.expectedPathAnchorIds[pathIndex + 1];
    nextActiveAnchor =
      anchors.find((row) => row.id === nextId && row.resolution !== "unresolved") ??
      anchors.find(
        (row) =>
          (row.status === "planned" || row.status === "active") &&
          row.resolution !== "unresolved",
      ) ??
      null;
  } else {
    nextActiveAnchor =
      anchors.find(
        (row) =>
          row.id === input.space.expectedPathAnchorIds[0] &&
          row.resolution !== "unresolved",
      ) ?? null;
  }

  return {
    currentAnchor,
    nextActiveAnchor,
    currentZone: resolveZoneForAnchor(input.space, currentAnchor),
    pathIndex,
    unresolvedSlots,
    hasUnresolvedSlots: hasUnresolvedExecutionSpaceSlots(input.space),
  };
}

/** @deprecated Use resolveExecutionSpaceContext */
export function resolveSpatialAnchorContext(input: {
  plan: ExecutionSpace;
  userLat?: number | null;
  userLng?: number | null;
}): ExecutionAnchorResolution {
  return resolveExecutionSpaceContext({
    space: input.plan,
    userLat: input.userLat,
    userLng: input.userLng,
  });
}

export function readExecutionAnchorById(
  space: ExecutionSpace,
  anchorId: string,
): ExecutionAnchor | null {
  const key = anchorId.trim();
  if (!key) {
    return null;
  }
  if (space.origin.id === key) {
    return space.origin;
  }
  return space.anchors.find((row) => row.id === key) ?? null;
}

/** @deprecated Use readExecutionAnchorById */
export const readSpatialAnchorById = readExecutionAnchorById;
