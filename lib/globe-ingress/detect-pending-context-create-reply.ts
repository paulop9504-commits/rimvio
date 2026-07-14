/**
 * Detect 「생성」/「취소」 for pending Context create gate.
 */

const CREATE_APPROVE =
  /^(?:create|생성|만들어(?:\s*줘)?|승인|좋아|응|네|예|ok|okay|yes)$/iu;
const CREATE_CANCEL =
  /^(?:cancel|취소|안\s*해|그만|나중에|no)$/iu;

export function isPendingContextCreateApprove(text: string): boolean {
  return CREATE_APPROVE.test(text.trim());
}

export function isPendingContextCreateCancel(text: string): boolean {
  return CREATE_CANCEL.test(text.trim());
}
