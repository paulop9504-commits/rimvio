/**
 * Replanning — when a node fails, attempt retry or skip with alternative.
 */

import type { PlanDAG, PlanNode } from "@/lib/reality-planner/types";

export function replanOnFailure(
  dag: PlanDAG,
  failedNodeId: string,
): PlanDAG {
  const now = new Date().toISOString();
  const failedNode = dag.nodes.find((n) => n.id === failedNodeId);
  if (!failedNode) return dag;

  if (failedNode.retryCount < failedNode.maxRetries) {
    const updatedNodes = dag.nodes.map((n) =>
      n.id === failedNodeId
        ? { ...n, status: "pending" as const, retryCount: n.retryCount + 1 }
        : n,
    );
    return { ...dag, nodes: updatedNodes, status: "replanning", updatedAt: now };
  }

  const dependents = dag.nodes.filter((n) => n.dependsOn.includes(failedNodeId));
  const skippedIds = new Set([failedNodeId, ...dependents.map((n) => n.id)]);

  const updatedNodes = dag.nodes.map((n) => {
    if (n.id === failedNodeId) return { ...n, status: "failed" as const };
    if (skippedIds.has(n.id) && n.status === "pending") return { ...n, status: "skipped" as const };
    return n;
  });

  const allTerminal = updatedNodes.every(
    (n) => n.status === "done" || n.status === "failed" || n.status === "skipped",
  );

  return {
    ...dag,
    nodes: updatedNodes,
    status: allTerminal ? "failed" : "executing",
    updatedAt: now,
  };
}
