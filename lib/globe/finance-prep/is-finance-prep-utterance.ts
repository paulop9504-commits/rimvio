const FINANCE_PREP_PATTERN =
  /(?:결제|환전|예산|budget|payment|카드|페이)/iu;

/** Utterances for one-shot finance / payment prep. */
export function isFinancePrepUtterance(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  return FINANCE_PREP_PATTERN.test(trimmed);
}

export { FINANCE_PREP_PATTERN };
