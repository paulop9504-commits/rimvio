/**
 * Session graph compare edges → Globe arcs (demo theater / graph growth).
 * Hairline signal only — no glow layer (keeps map readable).
 */

import type { SessionGraphV1 } from "@/lib/graph-command/types";
import { GLOBE_TOSS_THEME } from "@/lib/globe/globe-toss-theme";
import type { GlobeTripArc } from "@/lib/globe/project-trip-leg-arcs";

function pushSignal(
  arcs: GlobeTripArc[],
  input: {
    id: string;
    tripRef: string;
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
  },
): void {
  arcs.push({
    id: input.id,
    tripRef: input.tripRef,
    startLat: input.startLat,
    startLng: input.startLng,
    endLat: input.endLat,
    endLng: input.endLng,
    color: GLOBE_TOSS_THEME.signalArc,
    emphasis: "default",
    linkStyle: "signal",
  });
}

export function projectSessionGraphCompareArcs(
  graph: SessionGraphV1 | null | undefined,
): readonly GlobeTripArc[] {
  if (!graph) {
    return [];
  }
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const arcs: GlobeTripArc[] = [];
  const seen = new Set<string>();

  for (const edge of graph.edges) {
    if (edge.kind !== "compare") {
      continue;
    }
    const from = byId.get(edge.fromId);
    const to = byId.get(edge.toId);
    if (!from || !to) {
      continue;
    }
    if (from.lat == null || from.lng == null || to.lat == null || to.lng == null) {
      continue;
    }
    if (!from.visible && !from.pinned) {
      continue;
    }
    if (!to.visible && !to.pinned && to.kind !== "compare") {
      continue;
    }
    if (from.kind === "compare" || to.kind === "compare") {
      continue;
    }
    const key = [from.id, to.id].sort().join(":");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    pushSignal(arcs, {
      id: `gcmd-compare:${graph.contextEventId}:${edge.id}`,
      tripRef: `compare:${graph.contextEventId}`,
      startLat: from.lat,
      startLng: from.lng,
      endLat: to.lat,
      endLng: to.lng,
    });
  }

  const compareNodes = graph.nodes.filter((node) => node.kind === "compare");
  for (const hub of compareNodes) {
    const linked = graph.edges
      .filter(
        (edge) =>
          edge.kind === "compare" &&
          (edge.fromId === hub.id || edge.toId === hub.id),
      )
      .map((edge) =>
        edge.fromId === hub.id ? byId.get(edge.toId) : byId.get(edge.fromId),
      )
      .filter(
        (node): node is NonNullable<typeof node> =>
          Boolean(node) &&
          node!.lat != null &&
          node!.lng != null &&
          (node!.visible || node!.pinned),
      );
    if (linked.length < 2) {
      continue;
    }
    const left = linked[0]!;
    const right = linked[1]!;
    const key = [left.id, right.id].sort().join(":");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    pushSignal(arcs, {
      id: `gcmd-compare-pair:${graph.contextEventId}:${hub.id}`,
      tripRef: `compare:${graph.contextEventId}`,
      startLat: left.lat!,
      startLng: left.lng!,
      endLat: right.lat!,
      endLng: right.lng!,
    });
  }

  return arcs;
}
