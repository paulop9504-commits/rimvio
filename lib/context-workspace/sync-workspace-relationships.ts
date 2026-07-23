/**
 * Sync Workspace relationshipEdges from live nodes (ADR-023).
 */

import { deriveWorkspaceRelationshipEdges } from "@/lib/context-compiler/derive-relationship-edges";
import type {
  ContextWorkspaceRelationshipEdge,
  ContextWorkspaceState,
} from "@/lib/context-workspace/types";

export function buildWorkspaceRelationshipEdges(
  state: Pick<ContextWorkspaceState, "nodes" | "compareIds">,
): readonly ContextWorkspaceRelationshipEdge[] {
  const derived = deriveWorkspaceRelationshipEdges(
    state.nodes.map((n) => ({
      id: n.id,
      title: n.title,
      lat: n.lat,
      lng: n.lng,
      visible: n.visible,
    })),
  );
  const edges: ContextWorkspaceRelationshipEdge[] = derived
    .filter(
      (e): e is typeof e & { kind: "nearby" | "route" } =>
        e.kind === "nearby" || e.kind === "route",
    )
    .map((e) => ({
      id: e.id,
      kind: e.kind,
      fromId: e.fromId,
      toId: e.toId,
      labelKo: e.labelKo,
      meters: e.meters,
    }));

  if (state.compareIds.length >= 2) {
    const [a, b] = state.compareIds;
    edges.push({
      id: `rel:compare:${a}:${b}`,
      kind: "compare",
      fromId: a!,
      toId: b!,
      labelKo: "비교",
      meters: null,
    });
  }
  return edges.slice(0, 48);
}

export function withWorkspaceRelationships(
  state: ContextWorkspaceState,
): ContextWorkspaceState {
  return {
    ...state,
    relationshipEdges: buildWorkspaceRelationshipEdges(state),
  };
}
