import type { ExecutionGraph } from "@/lib/context-blueprint/execution-graph";
import {
  resolveEngineForExecutionNode,
  resolveEngineIdsForExecutionGraphNode,
} from "@/lib/engine/execution-graph-engine-bindings";
import type { RimvioEngineId } from "@/lib/engine/engine-types";

/** Derive Engine SKUs required by Blueprint executionGraph nodes + actions. */
export function deriveEngineIdsFromExecutionGraph(
  graph: ExecutionGraph | null | undefined,
): readonly RimvioEngineId[] {
  if (!graph?.nodes.length) {
    return [];
  }

  const ids = new Set<RimvioEngineId>();
  for (const node of graph.nodes) {
    for (const engineId of resolveEngineIdsForExecutionGraphNode(node.id)) {
      ids.add(engineId);
    }

    for (const action of node.actions) {
      const fromAction = resolveEngineForExecutionNode(
        node.id,
        action.executorHint ?? node.assignedExecutor,
        action.id,
      );
      if (fromAction) {
        ids.add(fromAction);
      }
    }
  }

  return [...ids];
}
