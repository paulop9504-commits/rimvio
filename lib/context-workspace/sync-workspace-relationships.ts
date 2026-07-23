/**
 * Sync Workspace relationshipEdges + Capsule compilerIr (ADR-023).
 */

import { deriveWorkspaceRelationshipEdges } from "@/lib/context-compiler/derive-relationship-edges";
import { compileContextFromUtterance } from "@/lib/context-compiler/compile-context-from-utterance";
import { refreshCompilerIrForWorkspace } from "@/lib/context-compiler/refresh-compiler-ir";
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

function attachCompilerIr(
  state: ContextWorkspaceState,
  utterance?: string | null,
): ContextWorkspaceState {
  const prior = state.compilerIr;
  const utter = utterance?.trim() || state.query.trim() || "";
  const compilerIr = prior
    ? refreshCompilerIrForWorkspace({
        priorIr: prior,
        utterance: utter,
        workspace: { ...state, compilerIr: prior },
      })
    : utter
      ? compileContextFromUtterance({
          utterance: utter,
          workspace: state,
        })
      : null;
  return { ...state, compilerIr };
}

export function withWorkspaceRelationships(
  state: ContextWorkspaceState,
  utterance?: string | null,
): ContextWorkspaceState {
  const withEdges: ContextWorkspaceState = {
    ...state,
    relationshipEdges: buildWorkspaceRelationshipEdges(state),
    compilerIr: state.compilerIr ?? null,
  };
  return attachCompilerIr(withEdges, utterance);
}
