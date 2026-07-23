/**
 * Derive relationship edges — 검색 → 관계 생성 (ADR-023).
 */

import { haversineKm } from "@/lib/feed/spacetime-fit";
import type {
  CompilerGraphEdge,
  CompilerGraphNode,
} from "@/lib/context-compiler/types";
import type { SessionGraphV1 } from "@/lib/graph-command/types";

const NEAR_M = 800;

export type WorkspaceRelNode = {
  readonly id: string;
  readonly title: string;
  readonly lat: number;
  readonly lng: number;
  readonly visible?: boolean;
  readonly reservable?: boolean;
};

function metersBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  return Math.round(haversineKm(a.lat, a.lng, b.lat, b.lng) * 1000);
}

/** Pairwise nearby + bookable hints from Workspace nodes. */
export function deriveWorkspaceRelationshipEdges(
  nodes: readonly WorkspaceRelNode[],
): readonly CompilerGraphEdge[] {
  const visible = nodes.filter(
    (n) =>
      (n.visible ?? true) &&
      Number.isFinite(n.lat) &&
      Number.isFinite(n.lng),
  );
  const edges: CompilerGraphEdge[] = [];
  for (let i = 0; i < visible.length; i += 1) {
    const a = visible[i]!;
    for (let j = i + 1; j < visible.length; j += 1) {
      const b = visible[j]!;
      const meters = metersBetween(a, b);
      if (meters <= NEAR_M) {
        edges.push({
          id: `rel:near:${a.id}:${b.id}`,
          kind: "nearby",
          fromId: a.id,
          toId: b.id,
          labelKo: meters < 100 ? "바로 옆" : `도보 ~${Math.max(1, Math.round(meters / 80))}분`,
          meters,
        });
      }
    }
  }
  // Route chain — order as listed (after optimize_route).
  for (let i = 0; i < visible.length - 1 && i < 7; i += 1) {
    const a = visible[i]!;
    const b = visible[i + 1]!;
    const meters = metersBetween(a, b);
    edges.push({
      id: `rel:route:${a.id}:${b.id}`,
      kind: "route",
      fromId: a.id,
      toId: b.id,
      labelKo: `${Math.round(meters)}m`,
      meters,
    });
  }
  return edges.slice(0, 40);
}

export function sessionGraphToCompilerGraph(graph: SessionGraphV1 | null): {
  nodes: readonly CompilerGraphNode[];
  edges: readonly CompilerGraphEdge[];
} {
  if (!graph) {
    return { nodes: [], edges: [] };
  }
  const nodes: CompilerGraphNode[] = graph.nodes
    .filter((n) => n.visible || n.pinned || n.kind === "anchor")
    .slice(0, 24)
    .map((n) => ({
      id: n.id,
      type: n.kind,
      labelKo: n.labelKo,
      lat: n.lat,
      lng: n.lng,
    }));
  const edges: CompilerGraphEdge[] = graph.edges.slice(0, 32).map((e) => ({
    id: e.id,
    kind:
      e.kind === "nearby"
        ? "nearby"
        : e.kind === "compare"
          ? "compare"
          : e.kind === "anchor"
            ? "anchor"
            : "nearby",
    fromId: e.fromId,
    toId: e.toId,
    labelKo: e.labelKo,
    meters: null,
  }));
  return { nodes, edges };
}
