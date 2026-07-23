/**
 * Current Context bar metrics — pure, testable.
 */

import type { ContextWorkspaceState } from "@/lib/context-workspace/types";

/** Thin progress from workspace shape — not a real planner metric. */
export function estimateWorkspaceProgressPercent(
  state: ContextWorkspaceState,
): number {
  const visible = state.nodes.filter((n) => n.visible);
  let score = 28;
  if (visible.length > 0) {
    score += 22;
  }
  if (visible.length >= 3) {
    score += 10;
  }
  if (state.selectedIds.length > 0) {
    score += 18;
  }
  if (
    state.filter.minRating != null ||
    state.filter.maxPriceBand != null ||
    (state.filter.tagIncludes?.length ?? 0) > 0 ||
    state.filter.queryIncludes
  ) {
    score += 12;
  }
  if (state.lastChangeKo) {
    score += 8;
  }
  return Math.min(92, score);
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
