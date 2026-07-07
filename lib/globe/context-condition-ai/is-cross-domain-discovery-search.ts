import { classifyContextConditionAnchorRequest } from "@/lib/globe/context-condition-ai/classify-context-condition-anchor-request";
import { parseCuisineCandidates } from "@/lib/globe/context-condition-ai/parse-cuisine-candidates";
import type { ContextConditionRecommendation } from "@/lib/globe/context-condition-ai/local-discovery-action-types";

const LODGING_HINT =
  /비슷한|같은\s*가격|숙소|호텔|stay|hotel|lodging|宿|ホテル/iu;
const EATERY_HINT =
  /맛집|먹을|식당|밥|brunch|lunch|dinner|food|eatery|restaurant|카페|ラーメン|食/iu;
const SEARCH_CUE =
  /주변|근처|찾|검색|추천|배치|꽂|nearby|search|보여|알려/iu;

/** Domain unclear — ask tap chips before scout. */
export function isAmbiguousDiscoveryIntent(message: string): boolean {
  const text = message.trim();
  if (!text) {
    return true;
  }
  if (parseCuisineCandidates(text).length > 0) {
    return false;
  }
  if (LODGING_HINT.test(text) || EATERY_HINT.test(text)) {
    return false;
  }
  return /찾|추천|뭐|어디|있어|보여|알려|해줘|줘|search|recommend|what|where/iu.test(
    text,
  );
}

function hasSearchCue(message: string): boolean {
  return SEARCH_CUE.test(message.trim());
}

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

  if (intent.lodgingSimilar && !intent.eateryNearby && hasEatery) {
    return true;
  }
  if (intent.eateryNearby && !intent.lodgingSimilar && hasLodging) {
    return true;
  }
  return false;
}

/** Prior turn had results — this message starts a new scout (not chip refine). */
export function isFollowUpDiscoveryTurn(
  message: string,
  previousRecommendations: readonly ContextConditionRecommendation[],
): boolean {
  const text = message.trim();
  if (!text || previousRecommendations.length === 0) {
    return false;
  }

  if (isCrossDomainDiscoverySearch(text, previousRecommendations)) {
    return true;
  }

  const intent = classifyContextConditionAnchorRequest(text);
  if (hasSearchCue(text) && (intent.lodgingSimilar || intent.eateryNearby)) {
    return true;
  }

  return isAmbiguousDiscoveryIntent(text);
}
