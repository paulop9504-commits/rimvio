import { copy } from "@/lib/copy/human-ko";
import type { GlobeDiscoveryFeedStatus } from "@/lib/globe/discovery/globe-discovery-feed";

export function getInfiniteDiscoveryFeedStatusCopy(
  status: GlobeDiscoveryFeedStatus,
  visibleCount: number,
  totalCount: number,
): string {
  if (status === "loading_more") {
    return copy.globe.intelligentPinFeedLoadingMore;
  }
  if (status === "more") {
    return copy.globe.intelligentPinFeedMore(visibleCount, totalCount);
  }
  return copy.globe.intelligentPinFeedComplete(totalCount);
}
