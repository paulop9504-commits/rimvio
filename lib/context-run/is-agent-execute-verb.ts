/**
 * Execute verbs — Cursor Agent Run triggers (not free-talk).
 * 「세워줘」「짜줘」「만들어줘」「계획 너가 세워줘」→ Activity Trail.
 */

import { hasActiveWorkspaceForGlobePrompt } from "@/lib/context-run/resolve-active-workspace-context";
import { extractTravelDestination } from "@/lib/experience-run/extract-travel-destination";
import { resolveRecentTravelDestinationHint } from "@/lib/context-run/resolve-recent-travel-destination-hint";

/**
 * Plan / setup / invent — user wants Rimvio to DO work now.
 * Allows particles between 「계획」and 「세워」(계획 너가 세워줘).
 */
const EXECUTE_VERB_RE =
  /(?:너가|니가|네가|알아서|대신)\s*(?:계획|일정|동선|플랜)?\s*(?:을\s*)?(?:세워|짜|만들|준비|구성하|실행하|돌려|진행해)|(?:계획|일정|동선|플랜).{0,24}(?:세워|짜|만들|준비|구성)|(?:세워|짜|만들|준비|계획하|구성하|실행하|돌려|진행해)\s*(?:줘|주세요|봐|달라)|(?:해\s*줘|해줘)|plan\s*(?:it|this|for\s*me)|set\s*(?:it\s*)?up|build\s*(?:a\s*)?(?:plan|itinerary)/iu;

/**
 * True when NL is an execute cue (Agent Run), not small-talk.
 * Active Workspace · dest in text · travel cue · recent chat dest → execute.
 */
export function isAgentExecuteVerbUtterance(utterance: string): boolean {
  const text = utterance.trim();
  if (!text) return false;
  if (!EXECUTE_VERB_RE.test(text)) return false;
  if (hasActiveWorkspaceForGlobePrompt()) return true;
  if (extractTravelDestination(text)) return true;
  if (/(?:여행|출장|트립|trip|일정|계획|동선|플랜)/iu.test(text)) return true;
  if (resolveRecentTravelDestinationHint(text)) return true;
  return /(?:계획|일정|동선|여행).{0,24}(?:세워|짜|만들)|(?:세워|짜|만들).{0,16}(?:계획|일정|동선|여행)/iu.test(
    text,
  );
}
