/**
 * Agent free-talk gate — greetings / chit-chat / short jokes.
 * Never steals Workspace work (Patch · Scout · Prepare).
 */

import { resolveSmallTalk } from "@/lib/globe/context-condition-ai/resolve-small-talk";
import { isWorkspaceAgentWorkUtterance } from "@/lib/context-run/is-workspace-agent-work-utterance";

/** Action / place work cues — not free-talk even if short. */
const WORK_OR_PLACE_CUE =
  /(?:호텔|숙소|맛집|카페|식당|약국|편의점|명소|관광|찾아|검색|보여|예약|준비|비교|빼\s*줘|넣어|커밋|저장|필터|정렬|근처|주변|역\s*앞|여행|일정|오사카|도쿄|교토|후쿠오카|서울|부산|제주|난바|우메다|osaka|tokyo|hotel|find|search|book)/iu;

const CASUAL_LONG =
  /(농담|웃긴|개그|ㅎㅎ|ㅋㅋ|진짜\s*웃|심심|그냥\s*말한|뭐해|뭐하냐|날씨\s*어때|오늘\s*어때|요즘\s*어때|피곤해|배고파|괜찮아|별로야|왜\s*그래|헐\s*대박)/iu;

/**
 * True when the utterance should stay conversational (no Tool / Patch).
 */
export function looksLikeAgentFreeTalk(utterance: string): boolean {
  const text = utterance.trim();
  if (!text) return false;
  if (isWorkspaceAgentWorkUtterance(text)) return false;

  // Keyword small-talk families (greeting · weather · mood · …)
  if (resolveSmallTalk({ text })) return true;

  if (text.length > 120) return false;
  if (WORK_OR_PLACE_CUE.test(text)) return false;

  // Short casual free-talk without place/work verbs.
  if (text.length <= 48 && CASUAL_LONG.test(text)) return true;

  return text.length <= 80 && CASUAL_LONG.test(text);
}
