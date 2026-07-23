/**
 * Pin cart — bookmarked nodes survive replace / rescout until user X.
 */

import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";

export function listPinnedWorkspaceNodes(
  nodes: readonly ContextWorkspaceNode[],
): ContextWorkspaceNode[] {
  return nodes.filter((n) => n.bookmarked);
}

/**
 * Merge incoming search candidates with existing cart pins.
 * Pinned places stay until explicit unpin (X) — hotel A survives eatery search.
 */
export function mergePreservePinnedNodes(
  previous: readonly ContextWorkspaceNode[],
  incoming: readonly ContextWorkspaceNode[],
  max = 36,
): ContextWorkspaceNode[] {
  const pinned = listPinnedWorkspaceNodes(previous);
  const pinnedByPlace = new Map(pinned.map((n) => [n.placeId, n] as const));
  const ordered: ContextWorkspaceNode[] = [];
  const seen = new Set<string>();

  for (const pin of pinned) {
    const match = incoming.find((n) => n.placeId === pin.placeId);
    const kept: ContextWorkspaceNode = match
      ? {
          ...match,
          id: pin.id,
          kind: pin.kind,
          bookmarked: true,
          visible: true,
          selected: pin.selected,
        }
      : {
          ...pin,
          bookmarked: true,
          visible: true,
        };
    ordered.push(kept);
    seen.add(pin.placeId);
  }

  for (const node of incoming) {
    if (seen.has(node.placeId)) {
      continue;
    }
    ordered.push(node);
    seen.add(node.placeId);
  }

  // Safety: if incoming empty but pins exist, keep pins only.
  if (ordered.length === 0 && pinnedByPlace.size > 0) {
    return [...pinnedByPlace.values()].slice(0, max);
  }

  return ordered.slice(0, max);
}

/** After filter sort — pinned stay visible even if filter would hide them. */
export function forcePinnedVisible(
  nodes: readonly ContextWorkspaceNode[],
): ContextWorkspaceNode[] {
  return nodes.map((n) =>
    n.bookmarked && !n.visible ? { ...n, visible: true } : n,
  );
}
