/**
 * Ordered stops for Brief Replay — Reality Draft day order when present.
 */

import type { BriefReplayStop } from "@/lib/context-workspace/context-brief/run-workspace-brief-replay";
import type { ContextWorkspaceState } from "@/lib/context-workspace/types";

/**
 * Prefer Reality Draft day sequence; else visible node order.
 */
export function buildBriefReplayNodeIds(
  state: ContextWorkspaceState,
): readonly string[] {
  const visible = state.nodes.filter(
    (n) =>
      n.visible &&
      Number.isFinite(n.lat) &&
      Number.isFinite(n.lng),
  );
  const byId = new Map(visible.map((n) => [n.id, n] as const));

  const draftIds =
    state.realityDraft?.days.flatMap((d) => d.nodes.map((n) => n.nodeId)) ??
    [];
  if (draftIds.length > 0) {
    const ordered: string[] = [];
    const seen = new Set<string>();
    for (const id of draftIds) {
      if (seen.has(id) || !byId.has(id)) continue;
      seen.add(id);
      ordered.push(id);
    }
    if (ordered.length > 0) return ordered;
  }

  return visible.map((n) => n.id);
}

export function buildBriefReplayStops(
  state: ContextWorkspaceState,
  nodeIds?: readonly string[] | null,
): readonly BriefReplayStop[] {
  const ids =
    nodeIds && nodeIds.length > 0
      ? nodeIds
      : buildBriefReplayNodeIds(state);
  const byId = new Map(state.nodes.map((n) => [n.id, n] as const));
  const stops: BriefReplayStop[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) continue;
    const node = byId.get(id);
    if (!node || !Number.isFinite(node.lat) || !Number.isFinite(node.lng)) {
      continue;
    }
    seen.add(id);
    stops.push({ id: node.id, lat: node.lat, lng: node.lng });
  }
  return stops;
}
