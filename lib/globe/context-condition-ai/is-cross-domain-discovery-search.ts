import { classifyContextConditionAnchorRequest } from "@/lib/globe/context-condition-ai/classify-context-condition-anchor-request";
import type { ContextConditionRecommendation } from "@/lib/globe/context-condition-ai/local-discovery-action-types";

/** Follow-up that switches resource kind — e.g. eatery batch → 「주변 호텔」. */
export function isCrossDomainDiscoverySearch(
  message: string,
  previousRecommendations: readonly ContextConditionRecommendation[],
): boolean {
  const text = message.trim();
  if (!text || previousRecommendations.length === 0) {
    return false;
  }

  const intent = classifyContextConditionAnchorRequest(text);
  const hasLodging = previousRecommendations.some((row) => row.kind === "lodging");
  const hasEatery = previousRecommendations.some((row) => row.kind === "eatery");

  if (intent.lodgingSimilar && !intent.eateryNearby && hasEatery && !hasLodging) {
    return true;
  }
  if (intent.eateryNearby && !intent.lodgingSimilar && hasLodging && !hasEatery) {
    return true;
  }
  return false;
}
