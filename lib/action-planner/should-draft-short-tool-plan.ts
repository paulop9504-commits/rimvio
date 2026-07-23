/**
 * Phase D / M1 — when a short ToolId plan should surface (rules-only).
 * Compound utterances keep the full Action Planner path.
 */

import { isCompoundActionUtterance } from "@/lib/action-planner/build-compare-reserve-plan";
import { parseLodgingStayTypeFromText } from "@/lib/globe/lodging/lodging-stay-types";
import { hasEateryDomainCue } from "@/lib/globe/domain-cues/eatery-domain-cues";
import { hasLodgingDomainCue } from "@/lib/globe/domain-cues/lodging-domain-cues";
import { classifyIntentFamily } from "@/lib/rule-engine/classify-intent-family";
import { isAmenityLookupQuery } from "@/lib/tool-registry/amenity-lookup-cue";
import { isBrowseExtractQuery } from "@/lib/tool-registry/browse-extract";

const HORIZONTAL_SEARCH_RE =
  /찾아|검색|추천|보여\s*줘|알려\s*줘|어디|주변|근처|search|find|recommend/iu;

/** Soft graph ops — never short-plan (Pin/Filter stay on soft confirm). */
const SOFT_OR_REVISE_INTENTS = new Set([
  "Pin",
  "Filter",
  "Delete",
  "Revise",
  "Navigate",
]);

/**
 * True for lodging / eatery / amenity (and stay-type) Search-like turns
 * that are not compound multi-intent plans.
 * Stay-type alone is not enough — 「APA호텔 고정」 must stay Pin, not Search.
 */
export function shouldDraftShortToolPlan(utterance: string): boolean {
  const text = utterance.trim();
  if (!text || text.length < 2) {
    return false;
  }
  if (isCompoundActionUtterance(text)) {
    return false;
  }

  const intent = classifyIntentFamily(text);
  if (SOFT_OR_REVISE_INTENTS.has(intent)) {
    return false;
  }

  const domainCue =
    hasLodgingDomainCue(text) ||
    hasEateryDomainCue(text) ||
    isAmenityLookupQuery(text) ||
    isBrowseExtractQuery(text) ||
    Boolean(parseLodgingStayTypeFromText(text)) ||
    /숙소|호텔|맛집|식당|카페|약국|편의점|액티비티|티켓|입장권/iu.test(text);
  const searchCue = HORIZONTAL_SEARCH_RE.test(text);

  if (
    intent === "Search" ||
    intent === "Analyze" ||
    intent === "Compare" ||
    intent === "Reserve"
  ) {
    if (domainCue || searchCue) {
      return true;
    }
  }

  if (domainCue && searchCue) {
    return true;
  }

  return false;
}
