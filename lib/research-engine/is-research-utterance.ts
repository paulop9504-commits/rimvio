/**
 * Vague recommend / compare — Research Engine owns discovery-with-evidence.
 * Lodging/eatery instant scout nouns still go to Operator scout first.
 */

import { hasConcurrentMultiDomainSearchCues } from "@/lib/globe/context-condition-ai/concurrent-lodging-eatery-cues";

const RESEARCH_CUE =
  /(?:어디(?:가|가\s*)?(?:좋|나을|추천)|추천해|비교해|골라줘|뭐가\s*나아|근거|믿을\s*만|조사해|리서치|장단점|어느\s*쪽|versus|vs\.?|better\s*than|recommend)/iu;

/** Multi-sector Research (sector mini-surgery) — not first-pin scout dump. */
const MULTI_SECTOR_RESEARCH_CUE =
  /(?:비교해|근거|조사해|리서치|장단점|어디(?:가|가\s*)?(?:좋|나을)|골라줘|뭐가\s*나아|versus|vs\.?)/iu;

const HARD_SCOUT =
  /(?:주변|근처).{0,8}(?:호텔|숙소|게스트|맛집|식당|카페)|(?:찾아줘|보여줘)/iu;

export function isResearchUtterance(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 240) {
    return false;
  }
  // Multi-sector first open → Operator scout. Research owns 납득/비교 follow-ups.
  if (hasConcurrentMultiDomainSearchCues(trimmed)) {
    if (!MULTI_SECTOR_RESEARCH_CUE.test(trimmed)) {
      return false;
    }
  }
  if (HARD_SCOUT.test(trimmed) && !RESEARCH_CUE.test(trimmed)) {
    return false;
  }
  return RESEARCH_CUE.test(trimmed);
}
