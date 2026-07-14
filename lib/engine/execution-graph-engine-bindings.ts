import type { DomainExecutorId } from "@/lib/context-blueprint/blueprint-constants";
import type { RimvioEngineId } from "@/lib/engine/engine-types";

export type ExecutionGraphEngineBinding = {
  readonly nodeId: string;
  readonly executorId: DomainExecutorId;
  readonly engineId: RimvioEngineId;
  readonly actionId?: string | null;
};

/** Execution Graph node ↔ Engine SKU — travel MVP reference. */
export const EXECUTION_GRAPH_ENGINE_BINDINGS: readonly ExecutionGraphEngineBinding[] =
  [
    { nodeId: "trip", executorId: "travel", engineId: "trip_experience_search" },
    { nodeId: "prepare", executorId: "travel", engineId: "trip_experience_search" },
    {
      nodeId: "prepare",
      executorId: "finance",
      engineId: "finance_prep",
      actionId: "prepare-fx",
    },
    {
      nodeId: "departure",
      executorId: "travel",
      engineId: "flight_booking",
    },
    { nodeId: "departure", executorId: "transit", engineId: "transit_navigate" },
    { nodeId: "arrival", executorId: "transit", engineId: "transit_navigate" },
    { nodeId: "stay", executorId: "lodging", engineId: "lodging_search" },
    { nodeId: "explore", executorId: "eatery", engineId: "eatery_search" },
    { nodeId: "explore", executorId: "amenity", engineId: "local_amenity_search" },
    { nodeId: "explore", executorId: "activity", engineId: "activity_search" },
    { nodeId: "return", executorId: "transit", engineId: "transit_navigate" },
  ];

/** All Engine SKUs bound to a graph node id (may be >1 executor per phase). */
export function resolveEngineIdsForExecutionGraphNode(
  nodeId: string,
): readonly RimvioEngineId[] {
  const ids = new Set<RimvioEngineId>();
  for (const row of EXECUTION_GRAPH_ENGINE_BINDINGS) {
    if (row.nodeId === nodeId) {
      ids.add(row.engineId);
    }
  }
  return [...ids];
}

export function resolveEngineForExecutionNode(
  nodeId: string,
  executorId?: DomainExecutorId | null,
  actionId?: string | null,
): RimvioEngineId | null {
  let rows = EXECUTION_GRAPH_ENGINE_BINDINGS.filter((row) => row.nodeId === nodeId);
  if (rows.length === 0) {
    return null;
  }
  if (actionId) {
    const actionRows = rows.filter((row) => row.actionId === actionId);
    if (actionRows.length > 0) {
      rows = actionRows;
    }
  }
  if (executorId) {
    const exact = rows.find((row) => row.executorId === executorId);
    if (exact) {
      return exact.engineId;
    }
  }
  return rows[0]?.engineId ?? null;
}

export function resolveExecutionNodesForEngine(
  engineId: RimvioEngineId,
): readonly ExecutionGraphEngineBinding[] {
  return EXECUTION_GRAPH_ENGINE_BINDINGS.filter((row) => row.engineId === engineId);
}

export function primaryExecutionNodeForEngine(
  engineId: RimvioEngineId,
): string | null {
  return resolveExecutionNodesForEngine(engineId)[0]?.nodeId ?? null;
}
