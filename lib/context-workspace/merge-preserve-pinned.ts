/**
 * Pin cart — bookmarked + Reality Draft seeds survive replace / rescout until user X.
 */

import type {
  ContextWorkspaceDomain,
  ContextWorkspaceNode,
} from "@/lib/context-workspace/types";
import { demoteUnpinnedTripPrepOnScoutReplace } from "@/lib/context-workspace/demote-stale-trip-prep";
import { isWorkspaceReadySlotNode } from "@/lib/context-workspace/workspace-map-focus";

export function listPinnedWorkspaceNodes(
  nodes: readonly ContextWorkspaceNode[],
): ContextWorkspaceNode[] {
  return nodes.filter((n) => n.bookmarked);
}

/** Cart = pins + resolved trip-draft Entities (USJ · APA…), not 「근처 카페」 shells. */
export function listCartWorkspaceNodes(
  nodes: readonly ContextWorkspaceNode[],
): ContextWorkspaceNode[] {
  return nodes.filter((n) => {
    if (n.bookmarked) return true;
    if (isWorkspaceReadySlotNode(n)) return false;
    return (
      n.source === "trip_prep_draft" || n.source.startsWith("trip_prep_")
    );
  });
}

/**
 * Merge incoming search candidates with existing cart.
 * Pinned + draft places stay until explicit unpin/discard —
 * hotel scout must not wipe Universal / Dotonbori pins.
 *
 * Order: **incoming scout first** (One Focus / peek), then cart.
 * Preserve ≠ put draft as Primary Focus after a fresh hotel search.
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

  for (const node of incoming) {
    const pin = cartByPlace.get(node.placeId);
    const kept: ContextWorkspaceNode = pin
      ? {
          ...node,
          id: pin.id,
          kind: pin.kind,
          bookmarked: pin.bookmarked || node.bookmarked,
          visible: true,
          selected: false,
          source: pin.source === "trip_prep_draft" ? pin.source : node.source,
          actionReadyState: pin.actionReadyState ?? node.actionReadyState,
          tags: [...new Set([...pin.tags, ...node.tags])],
        }
      : { ...node, selected: false, visible: true };
    ordered.push(kept);
    seen.add(node.placeId);
  }

  for (const pin of cart) {
    if (seen.has(pin.placeId)) continue;
    ordered.push({
      ...pin,
      visible: true,
      selected: false,
    });
    seen.add(pin.placeId);
  }

  if (ordered.length === 0 && cartByPlace.size > 0) {
    return [...cartByPlace.values()].slice(0, max);
  }

  return ordered.slice(0, max);
}

/** After filter sort — bookmarked only (P7: trip_prep demote must stick). */
export function forcePinnedVisible(
  nodes: readonly ContextWorkspaceNode[],
): ContextWorkspaceNode[] {
  return nodes.map((n) =>
    n.bookmarked && !n.visible ? { ...n, visible: true } : n,
  );
}

/**
 * P3 — Scout inventory merge.
 * - replace: refresh this domain; keep other domains + same-domain cart.
 * - add: keep entire previous Workspace; append new placeIds only.
 * P7: replace demotes non-bookmarked other-domain trip_prep.
 */
export function mergeScoutInventoryNodes(input: {
  readonly previous: readonly ContextWorkspaceNode[];
  readonly incoming: readonly ContextWorkspaceNode[];
  readonly domain: ContextWorkspaceDomain;
  readonly mode: "replace" | "add";
  readonly max?: number;
}): ContextWorkspaceNode[] {
  const max = input.max ?? 36;
  if (input.mode === "add") {
    const seen = new Set(input.previous.map((n) => n.placeId));
    const added = input.incoming.filter((n) => !seen.has(n.placeId));
    return [...input.previous, ...added].slice(0, max);
  }

  const otherDomain = input.previous.filter((n) => n.kind !== input.domain);
  const samePrev = input.previous.filter((n) => n.kind === input.domain);
  const sameMerged = mergePreservePinnedNodes(samePrev, input.incoming, max);
  const seen = new Set<string>();
  const out: ContextWorkspaceNode[] = [];
  // Scouted domain leads — trip_prep POI/food stay, but not as first peek.
  for (const n of [...sameMerged, ...otherDomain]) {
    if (seen.has(n.placeId)) continue;
    seen.add(n.placeId);
    out.push(n);
  }
  return demoteUnpinnedTripPrepOnScoutReplace({
    nodes: out.slice(0, max),
    scoutDomain: input.domain,
  });
}

/** Target-stack / additive scout — 「호텔도」「맛집도 추가」. */
export function isAdditiveScoutUtterance(utterance: string): boolean {
  const text = utterance.trim();
  if (!text) return false;
  return (
    /(?:맛집|호텔|숙소|카페|놀거리|관광|약국)도|(?:그리고|또)\s*(?:맛집|호텔|숙소|카페|놀거리)/iu.test(
      text,
    ) ||
    /(?:도|추가로|더)\s*(?:넣|추가|찾아|보여)|포함해서|같이\s*(?:넣|찾아)/iu.test(
      text,
    )
  );
}
