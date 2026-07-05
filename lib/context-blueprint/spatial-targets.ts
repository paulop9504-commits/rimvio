/**
 * Spatial Targets — WHERE each execution node runs.
 * Indexed by execution node id. Space is an attribute of execution, not the OS center.
 * @see docs/RIMVIO_EXECUTION_GRAPH.md
 */

import type { SpatialTarget } from "@/lib/context-blueprint/spatial-target";

export type SpatialTargets = {
  readonly contractKind: "spatial_targets";
  readonly byNodeId: Readonly<Record<string, SpatialTarget>>;
};

export type ComposeSpatialTargetsInput = {
  byNodeId: Readonly<Record<string, SpatialTarget>>;
};

export function composeSpatialTargets(
  input: ComposeSpatialTargetsInput,
): SpatialTargets {
  return {
    contractKind: "spatial_targets",
    byNodeId: { ...input.byNodeId },
  };
}

export function readSpatialTargetForNode(
  targets: SpatialTargets | null | undefined,
  nodeId: string,
): SpatialTarget | null {
  return targets?.byNodeId[nodeId] ?? null;
}

export function listPhysicalSpatialNodeIds(
  targets: SpatialTargets,
): string[] {
  return Object.entries(targets.byNodeId)
    .filter(([, target]) => target.mode === "physical" || target.mode === "any")
    .map(([nodeId]) => nodeId);
}
