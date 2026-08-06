/**
 * Workspace map One Focus — overview shows itinerary + live places;
 * slot enter shows candidates of that domain only (not chat essay).
 */

import type {
  ContextWorkspaceDomain,
  ContextWorkspaceNode,
} from "@/lib/context-workspace/types";

/** Orbit / invent labels — never treat as a resolved Place Entity. */
export function isGenericOrbitPlaceTitle(title: string): boolean {
  return /근처 카페|골목 맛집|로컬 식당|리버뷰 호텔|스테이 인|시티 로지|포토스팟|산책로|전망대|가까운 약국|24시 약국|역앞 약국/iu.test(
    title.trim(),
  );
}

/** Empty Intent slot — “여행지 숙소” / 「근처 카페」 skeleton, not a real hotel. */
export function isWorkspaceReadySlotNode(
  node: ContextWorkspaceNode,
): boolean {
  if (
    node.tags.includes("ready_slot") ||
    node.tags.includes("skeleton") ||
    node.tags.includes("placeholder_label") ||
    node.tags.includes("entity_unresolved")
  ) {
    return true;
  }
  const placeId = (node.placeId || "").trim();
  if (
    placeId.startsWith("burst:") ||
    node.id.includes(":burst:") ||
    placeId.startsWith("search:")
  ) {
    return true;
  }
  if (isGenericOrbitPlaceTitle(node.title)) {
    return true;
  }
  if (node.source !== "trip_prep_draft") {
    return false;
  }
  return /여행지\s*(숙소|맛집|도착|\d+일차|일정)|호텔\s*예약\s*준비/u.test(
    node.title,
  );
}

/** GPT place list / map pins — real hotels · cafes · POI only. */
export function isLiveWorkspacePlaceNode(
  node: ContextWorkspaceNode,
): boolean {
  if (!node.visible || isWorkspaceReadySlotNode(node)) return false;
  if (
    node.kind !== "lodging" &&
    node.kind !== "eatery" &&
    node.kind !== "poi" &&
    node.kind !== "amenity"
  ) {
    return false;
  }
  if (!Number.isFinite(node.lat) || !Number.isFinite(node.lng)) return false;
  if (Math.abs(node.lat) < 1e-6 && Math.abs(node.lng) < 1e-6) return false;
  return true;
}

export function isWorkspacePlaceCandidateNode(
  node: ContextWorkspaceNode,
): boolean {
  return isLiveWorkspacePlaceNode(node);
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
  if (
    node.kind === "lodging" ||
    node.tags.includes("lodging") ||
    node.tags.includes("stay")
  ) {
    return "lodging";
  }
  if (node.kind === "eatery" || node.tags.includes("food")) {
    return "eatery";
  }
  return null;
}

function isOverviewMapNode(node: ContextWorkspaceNode): boolean {
  if (!isLiveWorkspacePlaceNode(node)) return false;
  if (
    node.bookmarked ||
    node.selected ||
    node.actionReadyState === "approved" ||
    node.actionReadyState === "committed" ||
    node.actionReadyState === "ready"
  ) {
    return true;
  }
  if (
    node.source === "trip_prep_draft" ||
    node.source.startsWith("trip_prep_")
  ) {
    // Non-bookmarked trip_prep stays off overview (P7 contamination).
    return false;
  }
  // Tool / Maps / LiteAPI search results (source often "maps" | "liteapi" | …)
  return Boolean(node.source?.trim());
}

/**
 * Map pin set for One Focus.
 * - overview (null): resolved itinerary + live search pins — hide placeholder flood
 * - lodging/eatery/…: real candidates of that kind only
 */
export function filterNodesForWorkspaceMapFocus(input: {
  readonly nodes: readonly ContextWorkspaceNode[];
  readonly focusKind: ContextWorkspaceDomain | null;
}): ContextWorkspaceNode[] {
  const visible = input.nodes.filter((n) => n.visible);
  if (input.focusKind == null) {
    return visible.filter(isOverviewMapNode);
  }

  const candidates = visible.filter(
    (n) => n.kind === input.focusKind && isWorkspacePlaceCandidateNode(n),
  );
  if (candidates.length > 0) {
    return candidates;
  }

  // Still loading — keep the empty slot so the map isn’t blank.
  return visible
    .filter(
      (n) => n.kind === input.focusKind && isWorkspaceReadySlotNode(n),
    )
    .slice(0, 1);
}
