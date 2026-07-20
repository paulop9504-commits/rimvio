/**
 * When Graph `search_project` would steal lodging/eatery Field discovery,
 * defer to Context Condition scout (price · stay type · cuisine).
 * Explicit APA brand search stays on Graph / Osaka catalog.
 */

import { isInstantEaterySearch } from "@/lib/globe/context-condition-ai/instant-eatery-search";
import { isInstantLodgingSearch } from "@/lib/globe/context-condition-ai/instant-lodging-search";
import { parseMaxNightlyPriceKrw } from "@/lib/globe/context-condition-ai/filter-lodging-for-intent";
import { readContextConditionLastBatch } from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";
import { hasEateryDomainCue } from "@/lib/globe/domain-cues/eatery-domain-cues";
import { hasLodgingDomainCue } from "@/lib/globe/domain-cues/lodging-domain-cues";
import { parseLodgingStayTypeFromText } from "@/lib/globe/lodging/lodging-stay-types";
import { parseContextFields } from "@/lib/context-field";
import { isActionFirstUtterance } from "@/lib/rule-engine/is-action-first-utterance";
import { classifyIntentFamily } from "@/lib/rule-engine/classify-intent-family";
import { readSessionGraph } from "@/lib/graph-command/session-graph-store";
import { isSameProjectReSearchUtterance } from "@/lib/graph-command/is-same-project-re-search";
import { readLastContextPack } from "@/lib/context-builder/context-pack-memory";

function isExplicitApaBrandSearch(text: string): boolean {
  return (
    /apa|아파|アパ/iu.test(text) &&
    !/캡슐|capsule|게스트|호스텔|hostel|료칸|민박/iu.test(text)
  );
}

/**
 * True → tryRunGraphCommandOs must return null for search_project
 * so pin-bar scout can apply stayType + nightly price Fields.
 */
export function shouldDeferSearchProjectToDiscoveryScout(
  utterance: string,
  contextEventId?: string | null,
): boolean {
  const text = utterance.trim();
  if (!text) {
    return false;
  }
  if (classifyIntentFamily(text) === "Revise") {
    return false;
  }
  if (isExplicitApaBrandSearch(text)) {
    return false;
  }
  // 「다시 찾아」 with open lodging Diff → Tool Registry (hotel.lookup), not scout.
  const eventId = contextEventId?.trim() ?? "";
  if (eventId && isSameProjectReSearchUtterance(text)) {
    const lastBatch = readContextConditionLastBatch(eventId);
    const packDiff = readLastContextPack(eventId)?.lodgingDiff;
    const openLodging =
      Boolean(packDiff?.lastBatchId) ||
      Boolean(lastBatch?.recommendations?.some((row) => row.kind === "lodging"));
    if (openLodging) {
      return false;
    }
  }
  // Compound compare→reserve stays on Action Planner / Graph — never scout.
  if (
    /비교|compare|vs/iu.test(text) &&
    /예약|reserve|booking/iu.test(text)
  ) {
    return false;
  }
  // Open batch + refine/pin/filter → keep Graph (continuous map edit).
  if (eventId) {
    const lastBatch = readContextConditionLastBatch(eventId);
    if (
      lastBatch?.recommendations &&
      lastBatch.recommendations.length > 0 &&
      isActionFirstUtterance(text, readSessionGraph(eventId))
    ) {
      return false;
    }
  }
  // Lodging Field discovery (capsule · price · hostel) → scout inventory.
  if (isInstantLodgingSearch(text)) {
    return true;
  }
  if (
    parseLodgingStayTypeFromText(text) &&
    /찾|주변|근처|추천|보여|search|find/iu.test(text)
  ) {
    return true;
  }
  if (parseMaxNightlyPriceKrw(text) && hasLodgingDomainCue(text)) {
    return true;
  }
  const pack = parseContextFields(text);
  const fieldHeavy = Boolean(
    pack.price?.maxKrw != null ||
      pack.category ||
      pack.companion ||
      pack.popularity?.localFavoriteOnly ||
      pack.crowd ||
      pack.weather,
  );
  // Eatery with Fields (현지인 고깃집 · 2만 원…) → scout; bare 「주변 맛집」 stays Graph.
  if (
    fieldHeavy &&
    (hasEateryDomainCue(text) || isInstantEaterySearch(text)) &&
    /찾|주변|근처|추천|보여/iu.test(text)
  ) {
    return true;
  }
  if (
    fieldHeavy &&
    hasLodgingDomainCue(text) &&
    /찾|주변|근처|추천|보여/iu.test(text)
  ) {
    return true;
  }
  return false;
}
