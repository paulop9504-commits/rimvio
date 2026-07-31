/**
 * Workspace map One Focus — overview shows itinerary slots;
 * slot enter shows candidates of that domain only (not chat essay).
 */

import type {
  ContextWorkspaceDomain,
  ContextWorkspaceNode,
} from "@/lib/context-workspace/types";

/** Empty Intent slot — “여행지 숙소” skeleton, not a real hotel. */
export function isWorkspaceReadySlotNode(
  node: ContextWorkspaceNode,
): boolean {
  if (node.tags.includes("ready_slot") || node.tags.includes("skeleton")) {
    return true;
  }
  if (node.source !== "trip_prep_draft") {
    return false;
  }
  return /여행지\s*(숙소|맛집|도착|\d+일차|일정)|호텔\s*예약\s*준비/u.test(
    node.title,
  );
}

export function isWorkspacePlaceCandidateNode(
  node: ContextWorkspaceNode,
): boolean {
  return node.visible && !isWorkspaceReadySlotNode(node);
}

/**
 * Slot chips that should expand into live candidates (hotel / food).
 * Day POI skeletons stay soft-focus only until dedicated scout exists.
 */
export function resolveExpandableSlotKind(
  node: ContextWorkspaceNode | null,
): ContextWorkspaceDomain | null {
  if (!node || !isWorkspaceReadySlotNode(node)) {
    return null;
  }
  if (node.kind === "lodging" || node.tags.includes("lodging") || node.tags.includes("stay")) {
    return "lodging";
  }
  if (node.kind === "eatery" || node.tags.includes("food")) {
    return "eatery";
  }
  return null;
}

/**
 * Map pin set for One Focus.
 * - overview (null): draft itinerary + pins — hide scout flood
 * - lodging/eatery/…: real candidates of that kind only
 */
export function filterNodesForWorkspaceMapFocus(input: {
  readonly nodes: readonly ContextWorkspaceNode[];
  readonly focusKind: ContextWorkspaceDomain | null;
}): ContextWorkspaceNode[] {
  const visible = input.nodes.filter((n) => n.visible);
  if (input.focusKind == null) {
    // Itinerary + user pins only — scout candidates stay off until slot enter.
    return visible.filter(
      (n) =>
        n.source === "trip_prep_draft" ||
        n.bookmarked ||
        n.selected ||
        n.actionReadyState === "approved" ||
        n.actionReadyState === "committed",
    );
  }

  const candidates = visible.filter(
    (n) =>
      n.kind === input.focusKind && isWorkspacePlaceCandidateNode(n),
  );
  if (candidates.length > 0) {
    return candidates;
  }

  // Still loading — keep the empty slot so the map isn’t blank.
  return visible
    .filter(
      (n) =>
        n.kind === input.focusKind && isWorkspaceReadySlotNode(n),
    )
    .slice(0, 1);
}
