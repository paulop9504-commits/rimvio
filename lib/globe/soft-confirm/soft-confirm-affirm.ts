/** Soft yes / no after Filter / Pin / Delete / Share ask_chips (same cues as stay revise). */

/**
 * Affirm — bare yes, 「그렇게」, and short tails like 「응 그렇게 해줘」.
 */
export function isSoftConfirmAffirmUtterance(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 40) {
    return false;
  }
  return /^(?:네|예|응|ㅇㅇ|좋아|좋아요|그래|그래요|맞아|맞아요|ok|okay|yes|y|반영|반영해|그렇게|그걸로)(?:\s*(?:그렇게|그걸로))?(?:\s*(?:해(?:줘|요|주세요)?|주세요|반영(?:해(?:줘|요|주세요)?)?))?[!?.~ㅋㅎ…\s]*$/iu.test(
    t,
  );
}

export function isSoftConfirmRejectUtterance(text: string): boolean {
  return /^(?:아니|아니요|아니야|ㄴㄴ|취소|그만|됐어|ok\s*아냐|no|n)[!?.~ㅋㅎ…\s]*$/iu.test(
    text.trim(),
  );
}
