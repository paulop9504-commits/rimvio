/**
 * Live Graph — mutable execution graph layered on top of immutable Blueprint.
 *
 * Blueprint (ContextBlueprint) = frozen user intent snapshot (readOnly: true).
 * LiveGraph                    = mutable state that evolves as agents work.
 *
 * Separation enables: undo, audit trail, replay, diff, re-plan from intent.
 */

import type { ContextBlueprint } from "@/lib/context-blueprint/types";

export type LiveGraphNodeStatus =
  | "pending"
  | "searching"
  | "candidates_ready"
  | "comparing"
  | "selected"
  | "preparing"
  | "prepared"
  | "committed"
  | "failed"
  | "skipped";

export type LiveGraphCandidate = {
  readonly candidateId: string;
  readonly label: string;
  readonly score?: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
};

export type LiveGraphNode = {
  readonly nodeId: string;
  readonly blueprintNodeId: string | null;
  status: LiveGraphNodeStatus;
  candidates: LiveGraphCandidate[];
  selectedCandidateId: string | null;
  result: unknown | null;
  errorReason: string | null;
  updatedAt: string;
};

export type LiveGraph = {
  readonly id: string;
  readonly blueprintId: string;
  readonly blueprintVersion: number;
  readonly contextId: string;
  nodes: Map<string, LiveGraphNode>;
  readonly createdAt: string;
  lastModifiedAt: string;
};

export type LiveGraphSnapshot = {
  readonly graphId: string;
  readonly snapshotVersion: number;
  readonly nodes: readonly Readonly<LiveGraphNode>[];
  readonly takenAt: string;
};

export function createLiveGraph(blueprint: ContextBlueprint): LiveGraph {
  const now = new Date().toISOString();
  const nodes = new Map<string, LiveGraphNode>();

  const execGraph = blueprint.executionGraph;
  if (execGraph) {
    for (const node of execGraph.nodes) {
      nodes.set(node.id, {
        nodeId: node.id,
        blueprintNodeId: node.id,
        status: "pending",
        candidates: [],
        selectedCandidateId: null,
        result: null,
        errorReason: null,
        updatedAt: now,
      });
    }
  }

  return {
    id: `lg-${blueprint.id}`,
    blueprintId: blueprint.id,
    blueprintVersion: blueprint.version,
    contextId: blueprint.contextId,
    nodes,
    createdAt: now,
    lastModifiedAt: now,
  };
}

export function snapshotLiveGraph(graph: LiveGraph, version: number): LiveGraphSnapshot {
  return {
    graphId: graph.id,
    snapshotVersion: version,
    nodes: [...graph.nodes.values()].map((n) => ({ ...n })),
    takenAt: new Date().toISOString(),
  };
}
