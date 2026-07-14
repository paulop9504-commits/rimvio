/**
 * Detect NL Context Anchor move + approve/cancel replies.
 */

const MOVE_UTTERANCE =
  /(?:맥락\s*)?(?:위치|앵커|anchor)?\s*(?:를\s*)?(.+?)\s*(?:근처로|쪽으로|로|으로)\s*(?:맥락\s*)?(?:위치\s*)?(?:옮겨|이동|바꿔|변경|잡아)/iu;

const MOVE_UTTERANCE_ALT =
  /(.+?)\s*(?:근처로|쪽으로)\s*(?:옮겨|이동|바꿔)/iu;

const ANCHOR_APPROVE =
  /^(?:confirm|확인|옮겨|이동|좋아|응|네|예|ok|okay|yes)$/iu;
const ANCHOR_CANCEL =
  /^(?:cancel|취소|안\s*해|그만|나중에|no)$/iu;

export function isContextAnchorMoveApprove(text: string): boolean {
  return ANCHOR_APPROVE.test(text.trim());
}

export function isContextAnchorMoveCancel(text: string): boolean {
  return ANCHOR_CANCEL.test(text.trim());
}

/** Extract proposed place label from move utterance, or null. */
export function parseContextAnchorMoveTarget(
  text: string,
): string | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const m =
    trimmed.match(MOVE_UTTERANCE) ?? trimmed.match(MOVE_UTTERANCE_ALT);
  const raw = m?.[1]?.trim();
  if (!raw || raw.length < 2 || raw.length > 48) {
    return null;
  }
  return raw.replace(/^(?:저|그|이)\s*/, "").trim() || null;
}

export function isContextAnchorMoveUtterance(text: string): boolean {
  return parseContextAnchorMoveTarget(text) != null;
}
