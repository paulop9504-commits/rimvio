/**
 * Live Graph store — CRUD + mutations on the mutable execution layer.
 * Blueprint stays frozen. All execution mutations go here.
 */

import type {
  LiveGraph,
  LiveGraphCandidate,
  LiveGraphNodeStatus,
  LiveGraphSnapshot,
} from "@/lib/reality-graph/live-graph-types";
import { snapshotLiveGraph } from "@/lib/reality-graph/live-graph-types";

const graphs: Map<string, LiveGraph> = new Map();
const snapshots: Map<string, LiveGraphSnapshot[]> = new Map();

export function storeLiveGraph(graph: LiveGraph): void {
  graphs.set(graph.id, graph);
}

export function getLiveGraph(graphId: string): LiveGraph | null {
  return graphs.get(graphId) ?? null;
}

export function getLiveGraphByContext(contextId: string): LiveGraph | null {
  for (const g of graphs.values()) {
    if (g.contextId === contextId) return g;
  }
  return null;
}

export function updateLiveNodeStatus(
  graphId: string,
  nodeId: string,
  status: LiveGraphNodeStatus,
): boolean {
  const graph = graphs.get(graphId);
  if (!graph) return false;
  const node = graph.nodes.get(nodeId);
  if (!node) return false;
  node.status = status;
  node.updatedAt = new Date().toISOString();
  graph.lastModifiedAt = node.updatedAt;
  return true;
}

export function setLiveCandidates(
  graphId: string,
  nodeId: string,
  candidates: readonly LiveGraphCandidate[],
): boolean {
  const graph = graphs.get(graphId);
  if (!graph) return false;
  const node = graph.nodes.get(nodeId);
  if (!node) return false;
  node.candidates = [...candidates];
  node.status = "candidates_ready";
  node.updatedAt = new Date().toISOString();
  graph.lastModifiedAt = node.updatedAt;
  return true;
}

export function selectLiveCandidate(
  graphId: string,
  nodeId: string,
  candidateId: string,
): boolean {
  const graph = graphs.get(graphId);
  if (!graph) return false;
  const node = graph.nodes.get(nodeId);
  if (!node) return false;
  if (!node.candidates.some((c) => c.candidateId === candidateId)) return false;
  node.selectedCandidateId = candidateId;
  node.status = "selected";
  node.updatedAt = new Date().toISOString();
  graph.lastModifiedAt = node.updatedAt;
  return true;
}

export function setLiveNodeResult(
  graphId: string,
  nodeId: string,
  result: unknown,
): boolean {
  const graph = graphs.get(graphId);
  if (!graph) return false;
  const node = graph.nodes.get(nodeId);
  if (!node) return false;
  node.result = result;
  node.status = "committed";
  node.updatedAt = new Date().toISOString();
  graph.lastModifiedAt = node.updatedAt;
  return true;
}

export function failLiveNode(
  graphId: string,
  nodeId: string,
  reason: string,
): boolean {
  const graph = graphs.get(graphId);
  if (!graph) return false;
  const node = graph.nodes.get(nodeId);
  if (!node) return false;
  node.status = "failed";
  node.errorReason = reason;
  node.updatedAt = new Date().toISOString();
  graph.lastModifiedAt = node.updatedAt;
  return true;
}

export function takeLiveSnapshot(graphId: string): LiveGraphSnapshot | null {
  const graph = graphs.get(graphId);
  if (!graph) return null;
  const list = snapshots.get(graphId) ?? [];
  const snapshot = snapshotLiveGraph(graph, list.length + 1);
  list.push(snapshot);
  snapshots.set(graphId, list);
  return snapshot;
}

export function getLiveSnapshots(graphId: string): readonly LiveGraphSnapshot[] {
  return snapshots.get(graphId) ?? [];
}

export function diffLiveFromBlueprint(graphId: string): {
  mutated: string[];
  added: string[];
} {
  const graph = graphs.get(graphId);
  if (!graph) return { mutated: [], added: [] };

  const mutated: string[] = [];
  const added: string[] = [];

  for (const [, node] of graph.nodes) {
    if (node.blueprintNodeId === null) {
      added.push(node.nodeId);
    } else if (node.status !== "pending") {
      mutated.push(node.nodeId);
    }
  }

  return { mutated, added };
}
