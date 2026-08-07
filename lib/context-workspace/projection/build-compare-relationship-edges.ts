/**
 * Compare Relationship Edge — Object → Relationship → Decision.
 * Reuses Workspace relationshipEdges (route / nearby). Default map: hidden.
 * Never draws competing same-role soup (hotel↔hotel "비교").
 */

import type { ContextWorkspaceState } from "@/lib/context-workspace/types";
import type { CompareDecisionRelationship } from "@/lib/context-workspace/projection/types";
import { isMeaningfulWorkspaceMapEdge } from "@/lib/context-workspace/projection/is-meaningful-map-relationship";

/** Wire schema for Compare Relationship Edge Layer. */
export type CompareRelationshipEdge = {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly type: "nearby" | "route" | "compare";
  readonly label: string;
};

export function shortenRelationshipLabel(labelKo: string): string {
  const t = labelKo.trim();
  if (!t) return "";
  const walk = t.match(/도보\s*(\d+)\s*분/);
  if (walk) return `${walk[1]}분`;
  const min = t.match(/(\d+)\s*분/);
  if (min) return `${min[1]}분`;
  if (t === "비교") return "비교";
  return t.length > 10 ? `${t.slice(0, 10)}…` : t;
}

export function fromCompareDecisionRelationship(
  rel: CompareDecisionRelationship,
): CompareRelationshipEdge {
  return {
    id: rel.id,
    from: rel.fromEntityId,
    to: rel.toEntityId,
    type: rel.kind,
    label: shortenRelationshipLabel(rel.labelKo) || rel.labelKo,
  };
}

/**
 * Build Compare Relationship edges from Workspace SSOT edges.
 * Only edges that touch compare candidates and are cross-role (e.g. lodging↔poi).
 */
export function buildCompareRelationshipEdges(
  workspace: Pick<
    ContextWorkspaceState,
    "relationshipEdges" | "compareIds" | "nodes"
  >,
): readonly CompareRelationshipEdge[] {
  const candidateSet = new Set(workspace.compareIds);
  if (candidateSet.size < 2) return [];

  const out: CompareRelationshipEdge[] = [];
  const seen = new Set<string>();

  for (const e of workspace.relationshipEdges) {
    const touches =
      candidateSet.has(e.fromId) || candidateSet.has(e.toId);
    if (!touches) continue;
    if (
      !isMeaningfulWorkspaceMapEdge(e, workspace.nodes, workspace.compareIds)
    ) {
      continue;
    }
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    out.push({
      id: e.id,
      from: e.fromId,
      to: e.toId,
      type: e.kind === "compare" ? "nearby" : e.kind,
      label: shortenRelationshipLabel(e.labelKo) || e.labelKo || e.kind,
    });
  }

  // Prefer route/nearby to context (USJ / eatery) over noise.
  const ranked = [...out].sort((a, b) => {
    const score = (edge: CompareRelationshipEdge) =>
      edge.type === "route" ? 0 : edge.type === "nearby" ? 1 : 2;
    return score(a) - score(b);
  });

  return ranked.slice(0, 12);
}

export function collectCompareRelationshipEntityIds(
  edges: readonly CompareRelationshipEdge[],
): readonly string[] {
  const ids = new Set<string>();
  for (const e of edges) {
    ids.add(e.from);
    ids.add(e.to);
  }
  return [...ids];
}

export function buildEntityTitleMap(
  workspace: Pick<ContextWorkspaceState, "nodes">,
  extra?: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
  const map: Record<string, string> = { ...(extra ?? {}) };
  for (const n of workspace.nodes) {
    map[n.id] = n.title;
  }
  return map;
}
