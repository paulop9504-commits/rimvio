/**
 * Execution Space (Spatial Execution Graph) — L2 WHERE sub-contract.
 *
 * Globe AI designs the **stage** before resource search — not "search Osaka".
 * Hypothesis slots stay unresolved until user confirms (Article 0 + Execution Space law).
 *
 * Aliases: ExecutionSpace · SpatialPlan · Spatial Execution Graph
 * @see docs/RIMVIO_CONTEXT_OS_ARCHITECTURE.md § Execution Space
 */

import type {
  ExecutionSpaceResolution,
  ExecutionSpaceSlot,
} from "@/lib/context-blueprint/execution-space-slots";

export const SPATIAL_ANCHOR_KINDS = [
  "home",
  "station",
  "airport",
  "hotel_area",
  "lodging",
  "poi",
  "meeting",
  "provider",
  "marketplace_handoff",
  "custom",
] as const;

export type SpatialAnchorKind = (typeof SPATIAL_ANCHOR_KINDS)[number];

export const SPATIAL_ANCHOR_STATUSES = [
  "planned",
  "active",
  "visited",
  "skipped",
] as const;

export type SpatialAnchorStatus = (typeof SPATIAL_ANCHOR_STATUSES)[number];

export const EXECUTION_SPACE_STATUSES = [
  "planning",
  "in_transit",
  "on_site",
  "returning",
  "complete",
] as const;

/** @deprecated Use EXECUTION_SPACE_STATUSES */
export const SPATIAL_PLAN_STATUSES = EXECUTION_SPACE_STATUSES;

export type ExecutionSpaceStatus = (typeof EXECUTION_SPACE_STATUSES)[number];

/** @deprecated Use ExecutionSpaceStatus */
export type SpatialPlanStatus = ExecutionSpaceStatus;

export const SPATIAL_EDGE_MODES = [
  "walk",
  "drive",
  "transit",
  "flight",
  "train",
  "unknown",
] as const;

export type SpatialEdgeMode = (typeof SPATIAL_EDGE_MODES)[number];

/** Node in the Spatial Execution Graph. */
export type ExecutionAnchor = {
  readonly id: string;
  readonly label: string;
  readonly kind: SpatialAnchorKind;
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly zoneId?: string | null;
  readonly optional?: boolean;
  readonly status?: SpatialAnchorStatus;
  readonly triggerRadiusM?: number | null;
  readonly resolution?: ExecutionSpaceResolution;
  readonly linkedSlotId?: string | null;
};

/** @deprecated Use ExecutionAnchor */
export type SpatialAnchor = ExecutionAnchor;

export type ExecutionZone = {
  readonly id: string;
  readonly label: string;
  readonly countryCode?: string | null;
  readonly regionHint?: string | null;
};

export type SpatialEdge = {
  readonly fromAnchorId: string;
  readonly toAnchorId: string;
  readonly mode?: SpatialEdgeMode;
};

/**
 * Execution Space — WHERE the context will execute (Spatial Execution Graph).
 * Not an itinerary. Not a confirmed trip until user resolves hypothesis slots.
 */
export type ExecutionSpace = {
  readonly graphKind: "spatial_execution_graph";
  readonly origin: ExecutionAnchor;
  readonly anchors: readonly ExecutionAnchor[];
  readonly executionZones: readonly ExecutionZone[];
  readonly slots: readonly ExecutionSpaceSlot[];
  readonly expectedPathAnchorIds: readonly string[];
  readonly edges: readonly SpatialEdge[];
  readonly status: ExecutionSpaceStatus;
};

/** @deprecated Use ExecutionSpace */
export type SpatialPlan = ExecutionSpace;

export type ComposeExecutionSpaceInput = {
  origin: ExecutionAnchor;
  anchors: readonly ExecutionAnchor[];
  executionZones: readonly ExecutionZone[];
  slots?: readonly ExecutionSpaceSlot[];
  expectedPathAnchorIds: readonly string[];
  edges?: readonly SpatialEdge[];
  status?: ExecutionSpaceStatus;
};

/** @deprecated Use ComposeExecutionSpaceInput */
export type ComposeSpatialPlanInput = ComposeExecutionSpaceInput;

export function composeExecutionSpace(
  input: ComposeExecutionSpaceInput,
): ExecutionSpace {
  const anchorIds = new Set([
    input.origin.id,
    ...input.anchors.map((row) => row.id),
  ]);
  for (const anchorId of input.expectedPathAnchorIds) {
    if (!anchorIds.has(anchorId)) {
      throw new Error(`[ExecutionSpace] unknown anchor in path: ${anchorId}`);
    }
  }
  const edges =
    input.edges ??
    input.expectedPathAnchorIds.slice(1).map((toId, index) => ({
      fromAnchorId: input.expectedPathAnchorIds[index]!,
      toAnchorId: toId,
      mode: "unknown" as const,
    }));
  return {
    graphKind: "spatial_execution_graph",
    origin: input.origin,
    anchors: [...input.anchors],
    executionZones: [...input.executionZones],
    slots: [...(input.slots ?? [])],
    expectedPathAnchorIds: [...input.expectedPathAnchorIds],
    edges: [...edges],
    status: input.status ?? "planning",
  };
}

/** @deprecated Use composeExecutionSpace */
export const composeSpatialPlan = composeExecutionSpace;

export function listExecutionAnchors(space: ExecutionSpace): ExecutionAnchor[] {
  const byId = new Map<string, ExecutionAnchor>();
  byId.set(space.origin.id, space.origin);
  for (const anchor of space.anchors) {
    byId.set(anchor.id, anchor);
  }
  return space.expectedPathAnchorIds
    .map((id) => byId.get(id))
    .filter((row): row is ExecutionAnchor => row != null);
}

/** @deprecated Use listExecutionAnchors */
export const listSpatialAnchors = listExecutionAnchors;

export function hasUnresolvedExecutionSpaceSlots(
  space: ExecutionSpace,
): boolean {
  return space.slots.some((slot) => slot.resolution === "unresolved");
}

export function readUnresolvedExecutionSpaceSlots(
  space: ExecutionSpace,
): readonly ExecutionSpaceSlot[] {
  return space.slots.filter((slot) => slot.resolution === "unresolved");
}
