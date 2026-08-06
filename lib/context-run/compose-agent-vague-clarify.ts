/**
 * When Workspace is open but NL isn't Tool/Patch work — short clarify, not "Patch 없음".
 */

import { isWorkspaceAgentWorkUtterance } from "@/lib/context-run/is-workspace-agent-work-utterance";
import { looksLikeAgentFreeTalk } from "@/lib/context-run/looks-like-agent-free-talk";

export const AGENT_VAGUE_CLARIFY_KO =
  "지금은 작업장에서 듣고 있어요. 「더 싸게」, 「맛집도」, 「이 호텔 예약 준비」처럼 말해주면 바로 움직예요 🙂";

/**
 * True when Agent Loop should not run — conversation / clarify instead.
 */
export function shouldSkipAgentLoopForConversation(utterance: string): boolean {
  const text = utterance.trim();
  if (!text) return true;
  if (isWorkspaceAgentWorkUtterance(text)) return false;
  return true;
}

export function composeAgentVagueClarifyKo(utterance?: string | null): string {
  const text = utterance?.trim() ?? "";
  if (looksLikeAgentFreeTalk(text)) {
    // Free-talk path should reply elsewhere; this is the work-open vague fallback.
    return AGENT_VAGUE_CLARIFY_KO;
  }
  if (text.length > 0 && text.length <= 24) {
    return `「${text}」만으로는 Workspace를 바꾸기 어려워요. ${AGENT_VAGUE_CLARIFY_KO}`;
  }
  return AGENT_VAGUE_CLARIFY_KO;
}
