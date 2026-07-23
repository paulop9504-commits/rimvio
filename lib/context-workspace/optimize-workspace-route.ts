/**
 * Nearest-neighbor order for visible Workspace nodes (thin route optimize).
 */

import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";

function dist2(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = a.lat - b.lat;
  const dLng = a.lng - b.lng;
  return dLat * dLat + dLng * dLng;
}

/** Reorder visible nodes; hidden keep relative tail order. */
export function optimizeWorkspaceNodeRoute(
  nodes: readonly ContextWorkspaceNode[],
  startId?: string | null,
): ContextWorkspaceNode[] {
  const visible = nodes.filter((n) => n.visible);
  const hidden = nodes.filter((n) => !n.visible);
  if (visible.length <= 1) {
    return [...nodes];
  }

  const start =
    visible.find((n) => n.id === startId || n.placeId === startId) ??
    visible.find((n) => n.selected) ??
    visible[0]!;

  const remaining = visible.filter((n) => n.id !== start.id);
  const ordered: ContextWorkspaceNode[] = [start];
  let current = start;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let best = dist2(current, remaining[0]!);
    for (let i = 1; i < remaining.length; i += 1) {
      const d = dist2(current, remaining[i]!);
      if (d < best) {
        best = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0]!;
    ordered.push(next);
    current = next;
  }
  return [...ordered, ...hidden];
}
