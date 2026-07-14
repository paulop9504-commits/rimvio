import { classifyContextConditionAnchorRequest } from "@/lib/globe/context-condition-ai/classify-context-condition-anchor-request";
import { parseCuisineCandidates } from "@/lib/globe/context-condition-ai/parse-cuisine-candidates";
import { resolveLocalDiscoveryDomain } from "@/lib/globe/context-condition-ai/resolve-local-discovery-domain";
import type { ContextConditionRecommendation } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import { hasEateryDomainCue } from "@/lib/globe/domain-cues/eatery-domain-cues";
import { hasLodgingDomainCue } from "@/lib/globe/domain-cues/lodging-domain-cues";

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
  if (hasLodgingDomainCue(text) || hasEateryDomainCue(text)) {
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

  // Domain switch = fresh intent, never a follow-up. A message that introduces a
  // NEW discovery domain (activity/amenity) not present in the current batch must
  // NOT ride the previous (often auto-briefed cafe/hotel) results — otherwise the
  // convergence engine is skipped and "놀거리" degrades into a literal keyword
  // search that pins cafes/hotels. Let it restart so convergence can run.
  const domain = resolveLocalDiscoveryDomain(text);
  if (
    domain === "activity" &&
    !previousRecommendations.some((row) => row.kind === "activity")
  ) {
    return false;
  }
  if (
    domain === "amenity" &&
    !previousRecommendations.some((row) => row.kind === "amenity")
  ) {
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
