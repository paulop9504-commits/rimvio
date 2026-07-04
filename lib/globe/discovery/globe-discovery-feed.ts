export const GLOBE_DISCOVERY_FETCH_LIMIT = 18;
export const GLOBE_DISCOVERY_INITIAL_REVEAL_COUNT = 4;
export const GLOBE_DISCOVERY_REVEAL_STEP = 4;

export type GlobeDiscoveryFeedStatus = "more" | "loading_more" | "complete";

export function getInitialGlobeDiscoveryRevealCount(totalCount: number): number {
  return Math.min(Math.max(totalCount, 0), GLOBE_DISCOVERY_INITIAL_REVEAL_COUNT);
}

export function getNextGlobeDiscoveryRevealCount(
  currentCount: number,
  totalCount: number,
): number {
  const safeCurrent = Math.max(currentCount, 0);
  const nextStep =
    safeCurrent === 0 ? GLOBE_DISCOVERY_INITIAL_REVEAL_COUNT : GLOBE_DISCOVERY_REVEAL_STEP;
  return Math.min(Math.max(totalCount, 0), safeCurrent + nextStep);
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
