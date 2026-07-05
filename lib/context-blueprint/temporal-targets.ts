/**
 * Temporal Targets — WHEN each execution node applies.
 * Indexed by execution node id.
 * @see docs/RIMVIO_EXECUTION_GRAPH.md
 */

import type { ExecutionSpaceResolution } from "@/lib/context-blueprint/execution-space-slots";

export type TemporalTarget = {
  readonly resolution: ExecutionSpaceResolution;
  readonly label?: string | null;
  readonly windowStartIso?: string | null;
  readonly windowEndIso?: string | null;
  readonly flexible?: boolean;
  readonly linkedPhaseId?: string | null;
};

export type TemporalTargets = {
  readonly contractKind: "temporal_targets";
  readonly byNodeId: Readonly<Record<string, TemporalTarget>>;
};

export type ComposeTemporalTargetsInput = {
  byNodeId: Readonly<Record<string, TemporalTarget>>;
};

export function composeTemporalTargets(
  input: ComposeTemporalTargetsInput,
): TemporalTargets {
  return {
    contractKind: "temporal_targets",
    byNodeId: { ...input.byNodeId },
  };
}

export function readTemporalTargetForNode(
  targets: TemporalTargets | null | undefined,
  nodeId: string,
): TemporalTarget | null {
  return targets?.byNodeId[nodeId] ?? null;
}
