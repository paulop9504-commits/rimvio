/**
 * Spatial Target — WHERE a capability executes (optional per capability).
 * Digital / remote capabilities use mode: digital with no coords.
 * @see docs/RIMVIO_EXECUTION_GRAPH.md
 */

import type { ExecutionSpaceResolution } from "@/lib/context-blueprint/execution-space-slots";

export const SPATIAL_TARGET_MODES = [
  "physical",
  "digital",
  "remote",
  "any",
] as const;

export type SpatialTargetMode = (typeof SPATIAL_TARGET_MODES)[number];

/** Per execution node geography — space is an attribute of execution. */
export type SpatialTarget = {
  readonly mode: SpatialTargetMode;
  readonly resolution: ExecutionSpaceResolution;
  readonly label?: string | null;
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly zoneId?: string | null;
  readonly linkedSlotId?: string | null;
  readonly anchorId?: string | null;
};

export function isPhysicalSpatialTarget(
  target: SpatialTarget | null | undefined,
): boolean {
  return target?.mode === "physical" || target?.mode === "any";
}

export function composeDigitalSpatialTarget(): SpatialTarget {
  return {
    mode: "digital",
    resolution: "confirmed",
    label: "Online",
  };
}

export function composePhysicalSpatialTarget(input: {
  label: string;
  resolution?: ExecutionSpaceResolution;
  lat?: number | null;
  lng?: number | null;
  zoneId?: string | null;
  linkedSlotId?: string | null;
  anchorId?: string | null;
}): SpatialTarget {
  return {
    mode: "physical",
    resolution: input.resolution ?? "hypothesis",
    label: input.label,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    zoneId: input.zoneId ?? null,
    linkedSlotId: input.linkedSlotId ?? null,
    anchorId: input.anchorId ?? null,
  };
}
