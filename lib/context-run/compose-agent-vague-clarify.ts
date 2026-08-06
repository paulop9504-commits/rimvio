/**
 * When Workspace is open but NL isn't Tool/Patch work — short clarify, not "Patch 없음".
 */

import { isWorkspaceAgentWorkUtterance } from "@/lib/context-run/is-workspace-agent-work-utterance";
import { looksLikeAgentFreeTalk } from "@/lib/context-run/looks-like-agent-free-talk";
import { readContextWorkspace } from "@/lib/context-workspace/workspace-store";

export const AGENT_VAGUE_CLARIFY_KO =
  "지금은 작업장에서 듣고 있어요. 「더 싸게」, 「맛집도」, 「이 호텔 예약 준비」처럼 말해주면 바로 움직예요 🙂";

/** Soft chips the dock / status can offer on clarify (utterances, not labels). */
export const AGENT_VAGUE_CLARIFY_CHIP_UTTERANCES = [
  "더 싸게",
  "평점 높은 곳만",
  "맛집도",
  "3개만",
] as const;

/**
 * True when Agent Loop should not run — conversation / clarify instead.
 */
export function shouldSkipAgentLoopForConversation(utterance: string): boolean {
  const text = utterance.trim();
  if (!text) return true;
  if (isWorkspaceAgentWorkUtterance(text)) return false;
  return true;
}

export function composeAgentVagueClarifyKo(
  utterance?: string | null,
  opts?: {
    readonly destinationKo?: string | null;
    readonly visibleLodging?: number | null;
    readonly visibleEatery?: number | null;
    readonly visibleTotal?: number | null;
  },
): string {
  const text = utterance?.trim() ?? "";
  const dest = opts?.destinationKo?.trim() || null;
  const lodging = opts?.visibleLodging ?? 0;
  const eatery = opts?.visibleEatery ?? 0;
  const total = opts?.visibleTotal ?? lodging + eatery;

  if (dest || total > 0) {
    const bits: string[] = [];
    if (dest) bits.push(`${dest} 작업장`);
    if (lodging > 0) bits.push(`숙소 ${lodging}`);
    if (eatery > 0) bits.push(`맛집 ${eatery}`);
    else if (total > 0 && lodging === 0 && eatery === 0) {
      bits.push(`후보 ${total}`);
    }
    const head = bits.join(" · ");
    if (/어때|어떤|추천|괜찮은|고를까|고르|판단/iu.test(text)) {
      return `${head} 열려 있어요. 고르려면 「1번」, 「더 싸게」, 「3개만」처럼 말해 주세요.`;
    }
    if (text.length > 0 && text.length <= 24) {
      return `「${text}」로는 아직 손을 못 댔어요. ${head}에서 「더 싸게」나 「맛집도」로 이어서 말해 주세요.`;
    }
    return `${head} 열려 있어요. 「더 싸게」, 「맛집도」, 「예약 준비」처럼 말해 주세요.`;
  }

  if (looksLikeAgentFreeTalk(text)) {
    return AGENT_VAGUE_CLARIFY_KO;
  }
  if (text.length > 0 && text.length <= 24) {
    return `「${text}」만으로는 Workspace를 바꾸기 어려워요. ${AGENT_VAGUE_CLARIFY_KO}`;
  }
  return AGENT_VAGUE_CLARIFY_KO;
}

/** Workspace-aware clarify for soft Agent Loop misses. */
export function composeAgentVagueClarifyFromWorkspace(input: {
  readonly utterance: string;
  readonly contextEventId: string;
}): string {
  const state = readContextWorkspace(input.contextEventId);
  const visible = state?.nodes.filter((n) => n.visible) ?? [];
  return composeAgentVagueClarifyKo(input.utterance, {
    destinationKo: state?.constraintMemory?.destinationKo ?? null,
    visibleLodging: visible.filter((n) => n.kind === "lodging").length,
    visibleEatery: visible.filter((n) => n.kind === "eatery").length,
    visibleTotal: visible.length,
  });
}
