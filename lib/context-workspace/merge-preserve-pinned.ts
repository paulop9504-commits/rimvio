/**
 * Pin cart — bookmarked + Reality Draft seeds survive replace / rescout until user X.
 */

import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";

export function listPinnedWorkspaceNodes(
  nodes: readonly ContextWorkspaceNode[],
): ContextWorkspaceNode[] {
  return nodes.filter((n) => n.bookmarked);
}

/** Cart = pins + AI trip-draft Entities (USJ · 도톤보리 …). */
export function listCartWorkspaceNodes(
  nodes: readonly ContextWorkspaceNode[],
): ContextWorkspaceNode[] {
  return nodes.filter(
    (n) => n.bookmarked || n.source === "trip_prep_draft",
  );
}

/**
 * Merge incoming search candidates with existing cart.
 * Pinned + draft places stay until explicit unpin/discard —
 * hotel scout must not wipe Universal / Dotonbori pins.
 */
export function mergePreservePinnedNodes(
  previous: readonly ContextWorkspaceNode[],
  incoming: readonly ContextWorkspaceNode[],
  max = 36,
): ContextWorkspaceNode[] {
  const cart = listCartWorkspaceNodes(previous);
  const cartByPlace = new Map(cart.map((n) => [n.placeId, n] as const));
  const ordered: ContextWorkspaceNode[] = [];
  const seen = new Set<string>();

  for (const pin of cart) {
    const match = incoming.find((n) => n.placeId === pin.placeId);
    const kept: ContextWorkspaceNode = match
      ? {
          ...match,
          id: pin.id,
          kind: pin.kind,
          bookmarked: pin.bookmarked || match.bookmarked,
          visible: true,
          selected: pin.selected,
          source: pin.source === "trip_prep_draft" ? pin.source : match.source,
          actionReadyState: pin.actionReadyState ?? match.actionReadyState,
          tags: [...new Set([...pin.tags, ...match.tags])],
        }
      : {
          ...pin,
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

  if (ordered.length === 0 && cartByPlace.size > 0) {
    return [...cartByPlace.values()].slice(0, max);
  }

  return ordered.slice(0, max);
}

/** After filter sort — cart stay visible even if filter would hide them. */
export function forcePinnedVisible(
  nodes: readonly ContextWorkspaceNode[],
): ContextWorkspaceNode[] {
  return nodes.map((n) =>
    (n.bookmarked || n.source === "trip_prep_draft") && !n.visible
      ? { ...n, visible: true }
      : n,
  );
}
