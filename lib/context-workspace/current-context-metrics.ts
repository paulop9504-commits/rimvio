/**
 * Current Context bar metrics — pure, testable.
 */

import type { ContextWorkspaceState } from "@/lib/context-workspace/types";
import { isWorkspaceReadySlotNode } from "@/lib/context-workspace/workspace-map-focus";

/** Thin progress from workspace shape — Capsule auto-save polish (P7). */
export function estimateWorkspaceProgressPercent(
  state: ContextWorkspaceState,
): number {
  const visible = state.nodes.filter(
    (n) => n.visible && !isWorkspaceReadySlotNode(n),
  );
  let score = 18;
  if (visible.length > 0) score += 14;
  if (visible.length >= 3) score += 8;
  if (visible.some((n) => n.kind === "lodging")) score += 10;
  if (visible.some((n) => n.kind === "eatery")) score += 6;
  if (state.selectedIds.length > 0) score += 14;
  if (state.nodes.some((n) => n.bookmarked)) score += 8;
  if (state.realityDraft?.days?.length) score += 10;
  if (state.constraintMemory?.destinationKo) score += 6;
  if (
    state.constraintMemory?.maxNightlyPriceKrw != null ||
    state.constraintMemory?.keepTopN != null ||
    state.filter.minRating != null ||
    state.filter.maxPriceBand != null ||
    (state.filter.tagIncludes?.length ?? 0) > 0 ||
    state.filter.queryIncludes
  ) {
    score += 8;
  }
  if (state.lastChangeKo) score += 4;
  return Math.min(96, score);
}

export function relativeWorkspaceUpdateKo(
  iso: string,
  nowMs = Date.now(),
): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) {
    return "방금";
  }
  const sec = Math.max(0, Math.floor((nowMs - t) / 1000));
  if (sec < 45) {
    return "방금";
  }
  if (sec < 3600) {
    return `${Math.floor(sec / 60)}분 전`;
  }
  if (sec < 86400) {
    return `${Math.floor(sec / 3600)}시간 전`;
  }
  return `${Math.floor(sec / 86400)}일 전`;
}
