export const GLOBE_DISCOVERY_FETCH_LIMIT = 28;
export const GLOBE_DISCOVERY_INITIAL_REVEAL_COUNT = 4;
/** When Intent is locked (cuisine/brand), open more cards up front. */
export const GLOBE_DISCOVERY_CONVERGED_INITIAL_REVEAL_COUNT = 8;
export const GLOBE_DISCOVERY_REVEAL_STEP = 4;
export const GLOBE_DISCOVERY_CONVERGED_REVEAL_STEP = 6;

export type GlobeDiscoveryFeedStatus = "more" | "loading_more" | "complete";

export function getInitialGlobeDiscoveryRevealCount(
  totalCount: number,
  options?: { intentConverged?: boolean },
): number {
  const cap = options?.intentConverged
    ? GLOBE_DISCOVERY_CONVERGED_INITIAL_REVEAL_COUNT
    : GLOBE_DISCOVERY_INITIAL_REVEAL_COUNT;
  return Math.min(Math.max(totalCount, 0), cap);
}

export function getNextGlobeDiscoveryRevealCount(
  currentCount: number,
  totalCount: number,
  options?: { intentConverged?: boolean },
): number {
  const safeCurrent = Math.max(currentCount, 0);
  const step =
    safeCurrent === 0
      ? options?.intentConverged
        ? GLOBE_DISCOVERY_CONVERGED_INITIAL_REVEAL_COUNT
        : GLOBE_DISCOVERY_INITIAL_REVEAL_COUNT
      : options?.intentConverged
        ? GLOBE_DISCOVERY_CONVERGED_REVEAL_STEP
        : GLOBE_DISCOVERY_REVEAL_STEP;
  return Math.min(Math.max(totalCount, 0), safeCurrent + step);
}

export function hasMoreGlobeDiscoveryItems(
  visibleCount: number,
  totalCount: number,
): boolean {
  return visibleCount < totalCount;
}

export function resolveGlobeDiscoveryFeedStatus(input: {
  visibleCount: number;
  totalCount: number;
  loadingMore: boolean;
}): GlobeDiscoveryFeedStatus {
  if (input.loadingMore && input.visibleCount < input.totalCount) {
    return "loading_more";
  }
  if (input.visibleCount < input.totalCount) {
    return "more";
  }
  return "complete";
}
