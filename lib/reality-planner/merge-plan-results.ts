/**
 * Merge results from parallel agent executions back into the PlanDAG.
 */

import type { PlanDAG, PlanNode } from "@/lib/reality-planner/types";

export type NodeResult = {
  readonly nodeId: string;
  readonly success: boolean;
  readonly result?: unknown;
  readonly errorReason?: string;
};

export function mergePlanResults(
  dag: PlanDAG,
  results: readonly NodeResult[],
): PlanDAG {
  const resultMap = new Map(results.map((r) => [r.nodeId, r]));
  const now = new Date().toISOString();

  const updatedNodes: PlanNode[] = dag.nodes.map((n) => {
    const r = resultMap.get(n.id);
    if (!r) return n;
    return {
      ...n,
      status: r.success ? ("done" as const) : ("failed" as const),
      result: r.result,
      errorReason: r.errorReason,
    };
  });

  const allDone = updatedNodes.every(
    (n) => n.status === "done" || n.status === "skipped",
  );
  const anyFailed = updatedNodes.some((n) => n.status === "failed");

  return {
    ...dag,
    nodes: updatedNodes,
    status: allDone ? "completed" : anyFailed ? "failed" : "executing",
    updatedAt: now,
  };
}
