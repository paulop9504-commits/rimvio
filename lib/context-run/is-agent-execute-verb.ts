/**
 * Execute verbs — Cursor Agent Run triggers (not free-talk).
 * 「세워줘」「짜줘」「만들어줘」→ Activity Trail, not essay clarify.
 */

import { hasActiveWorkspaceForGlobePrompt } from "@/lib/context-run/resolve-active-workspace-context";
import { extractTravelDestination } from "@/lib/experience-run/extract-travel-destination";

/** Plan / setup / invent — user wants Rimvio to DO work now. */
const EXECUTE_VERB_RE =
  /(?:너가|니가|네가|알아서|대신)?\s*(?:세워|짜|만들|준비|계획하|구성하|실행하|돌려|진행해|해\s*줘|해줘)\s*(?:줘|주세요|봐|달라|주세요)?|(?:계획|일정|동선|플랜|trip\s*plan)\s*(?:을\s*)?(?:세워|짜|만들)|(?:세워|짜|만들)\s*(?:줘|주세요)|plan\s*(?:it|this|for\s*me)|set\s*(?:it\s*)?up|build\s*(?:a\s*)?(?:plan|itinerary)/iu;

/**
 * True when NL is an execute cue (Agent Run), not small-talk.
 * With active Workspace, bare 「세워줘」counts. Without, needs dest or travel cue.
 */
export function isAgentExecuteVerbUtterance(utterance: string): boolean {
  const text = utterance.trim();
  if (!text) return false;
  if (!EXECUTE_VERB_RE.test(text)) return false;
  if (hasActiveWorkspaceForGlobePrompt()) return true;
  if (extractTravelDestination(text)) return true;
  if (/(?:여행|출장|트립|trip|일정|계획)/iu.test(text)) return true;
  // Bare 「세워줘」with no context — still execute if verb is clear plan-build.
  return /(?:계획|일정|동선|여행).{0,8}(?:세워|짜|만들)|(?:세워|짜|만들).{0,8}(?:계획|일정|동선|여행)/iu.test(
    text,
  );
}
