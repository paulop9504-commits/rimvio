/**
 * Workspace map lines — only user-centric relationships.
 * Competing same-role candidates (hotel↔hotel) never draw a line.
 */

import type {
  ContextWorkspaceNode,
  ContextWorkspaceRelationshipEdge,
} from "@/lib/context-workspace/types";

export function isCompetingSameRolePair(
  from: Pick<ContextWorkspaceNode, "id" | "kind"> | null | undefined,
  to: Pick<ContextWorkspaceNode, "id" | "kind"> | null | undefined,
  compareIds: ReadonlySet<string>,
): boolean {
  if (!from || !to) {
    // Both endpoints are compare candidates without node kinds → treat as soup.
    return true;
  }
  if (from.kind !== to.kind) return false;
  return compareIds.has(from.id) && compareIds.has(to.id);
}

/**
 * True if this edge should appear on the Workspace map overlay.
 * Drop pure `compare` and same-role candidate pairs; keep lodging↔poi/eatery/route.
 */
export function isMeaningfulWorkspaceMapEdge(
  edge: Pick<ContextWorkspaceRelationshipEdge, "kind" | "fromId" | "toId">,
  nodes: readonly Pick<ContextWorkspaceNode, "id" | "kind">[],
  compareIds: readonly string[],
): boolean {
  if (edge.kind === "compare") return false;

  const candidateSet = new Set(compareIds);
  const from = nodes.find((n) => n.id === edge.fromId);
  const to = nodes.find((n) => n.id === edge.toId);

  const bothCandidates =
    candidateSet.has(edge.fromId) && candidateSet.has(edge.toId);
  if (bothCandidates) {
    if (isCompetingSameRolePair(from, to, candidateSet)) return false;
  }

  // Same kind without a cross-role story is never a distance line we want.
  if (from && to && from.kind === to.kind) return false;

  return edge.kind === "nearby" || edge.kind === "route";
}
