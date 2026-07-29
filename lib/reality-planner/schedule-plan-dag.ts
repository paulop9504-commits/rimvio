/**
 * Schedule PlanDAG nodes by dependency order (topological sort).
 * Returns batches of nodes that can run in parallel.
 */

import type { PlanDAG, PlanNode } from "@/lib/reality-planner/types";

export type ScheduleBatch = {
  readonly batchIndex: number;
  readonly nodeIds: readonly string[];
};

export function schedulePlanDag(dag: PlanDAG): readonly ScheduleBatch[] {
  const nodes = new Map(dag.nodes.map((n) => [n.id, n]));
  const remaining = new Set(dag.nodes.filter((n) => n.status === "pending").map((n) => n.id));
  const completed = new Set(dag.nodes.filter((n) => n.status === "done").map((n) => n.id));
  const batches: ScheduleBatch[] = [];

  let batchIndex = 0;
  while (remaining.size > 0) {
    const ready: string[] = [];
    for (const id of remaining) {
      const node = nodes.get(id)!;
      const depsResolved = node.dependsOn.every(
        (dep) => completed.has(dep) || !remaining.has(dep),
      );
      if (depsResolved) ready.push(id);
    }

    if (ready.length === 0) break; // circular or blocked

    batches.push({ batchIndex, nodeIds: ready });
    for (const id of ready) {
      remaining.delete(id);
      completed.add(id);
    }
    batchIndex++;
  }

  return batches;
}

/** Get the next batch of executable nodes. */
export function getNextBatch(dag: PlanDAG): readonly PlanNode[] {
  const batches = schedulePlanDag(dag);
  if (batches.length === 0) return [];
  const nodeMap = new Map(dag.nodes.map((n) => [n.id, n]));
  return batches[0]!.nodeIds
    .map((id) => nodeMap.get(id))
    .filter((n): n is PlanNode => n != null && n.status === "pending");
}
