/** Search tab composer routing — ingress first, no generic AI without @ or Feed context. */

export type SearchComposerIntent = "mention" | "capture" | "generic_ai";

const GENERIC_AI_PATTERN =
  /(?:맛집|식당|메뉴|뭐\s*먹|뭘\s*먹|배고파|저녁|점심|아침|카페\s*추천|길찾기|어떻게\s*가|가는\s*길|가는법|네비|내비|추천해|추천\s*좀|알려줘|어디\s*가|근처|주변)/iu;

const PLANNING_MEMO_PATTERN =
  /(?:여행|일정|약속|만남|메모|제주|오사카|부산|서울|\d{1,2}\s*월|\d{1,2}\s*일|\d+\s*박|N박)/iu;

export function classifySearchComposerIntent(text: string): SearchComposerIntent {
  const trimmed = text.trim();
  if (!trimmed) {
    return "capture";
  }
  if (trimmed.startsWith("@")) {
    return "mention";
  }
  if (/https?:\/\//iu.test(trimmed)) {
    return "capture";
  }

  const planningMemo = PLANNING_MEMO_PATTERN.test(trimmed);
  if (GENERIC_AI_PATTERN.test(trimmed) && !planningMemo) {
    return "generic_ai";
  }

  return "capture";
}
