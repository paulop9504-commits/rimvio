/**
 * Execution Graph — Method 2 OS kernel.
 * Execution is the protagonist. Each node: Spatial Target → Resources → Actions.
 * @see docs/RIMVIO_EXECUTION_GRAPH.md
 */

import type {
  ContextResourceKind,
  DomainExecutorId,
} from "@/lib/context-blueprint/blueprint-constants";
import type { ExecutionSpaceResolution } from "@/lib/context-blueprint/execution-space-slots";
import type { ExecutionNodeAction } from "@/lib/context-blueprint/execution-node-action";
import type { NodeResourceState } from "@/lib/context-blueprint/node-resource-state";

/** Phase-oriented kinds — same graph shape across travel · trade · medical · work. */
export const EXECUTION_NODE_KINDS = [
  "trip",
  "prepare",
  "departure",
  "arrival",
  "stay",
  "explore",
  "return",
  "visit",
  "treatment",
  "listing",
  "negotiation",
  "meeting",
  "payment",
  "complete",
  "discover",
  "allocate",
  "approval_gate",
  "commit",
  "observe",
] as const;

export type ExecutionNodeKind = (typeof EXECUTION_NODE_KINDS)[number];

export const EXECUTION_NODE_STATUSES = [
  "pending",
  "ready",
  "running",
  "prepared",
  "waiting_approval",
  "done",
  "blocked",
] as const;

export type ExecutionNodeStatus = (typeof EXECUTION_NODE_STATUSES)[number];

/**
 * One execution step.
 * Spatial / temporal live in Blueprint.spatialTargets / temporalTargets keyed by id.
 */
export type ExecutionGraphNode = {
  readonly id: string;
  readonly kind: ExecutionNodeKind;
  readonly label: string;
  readonly resolution: ExecutionSpaceResolution;
  readonly resourceKinds: readonly ContextResourceKind[];
  readonly actions: readonly ExecutionNodeAction[];
  readonly assignedExecutor: DomainExecutorId | null;
  /**
   * Travel resource scout FSM (departure / stay / explore).
   * Optional — trade/medical graphs omit this.
   */
  readonly resourceState?: NodeResourceState | null;
  /** @deprecated Method 1 — prefer resourceKinds on node */
  readonly capabilityIds?: readonly string[];
  /** @deprecated */
  readonly requiresSpatial?: boolean;
  /** @deprecated */
  readonly requiresTemporal?: boolean;
};

export type ExecutionGraphEdge = {
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly reason?: string | null;
};

export type ExecutionGraph = {
  readonly graphKind: "execution_graph";
  readonly nodes: readonly ExecutionGraphNode[];
  readonly edges: readonly ExecutionGraphEdge[];
};

export type ComposeExecutionGraphInput = {
  nodes: readonly ExecutionGraphNode[];
  edges?: readonly ExecutionGraphEdge[];
};

export function composeExecutionGraph(
  input: ComposeExecutionGraphInput,
): ExecutionGraph {
  const ids = new Set(input.nodes.map((row) => row.id));
  for (const edge of input.edges ?? []) {
    if (!ids.has(edge.fromNodeId) || !ids.has(edge.toNodeId)) {
      throw new Error("[ExecutionGraph] edge references unknown node");
    }
  }
  return {
    graphKind: "execution_graph",
    nodes: [...input.nodes],
    edges: [...(input.edges ?? [])],
  };
}

export function readExecutionNodesForExecutor(
  graph: ExecutionGraph,
  executor: DomainExecutorId,
): ExecutionGraphNode[] {
  return graph.nodes.filter((row) => row.assignedExecutor === executor);
}

export function readUnresolvedExecutionNodes(
  graph: ExecutionGraph,
): ExecutionGraphNode[] {
  return graph.nodes.filter((row) => row.resolution === "unresolved");
}

export function readExecutionNodeById(
  graph: ExecutionGraph,
  nodeId: string,
): ExecutionGraphNode | null {
  return graph.nodes.find((row) => row.id === nodeId) ?? null;
}
