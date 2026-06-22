const TYPO_REPLACEMENTS: ReadonlyArray<{ pattern: RegExp; replacement: string }> = [
  { pattern: /겔러리아/giu, replacement: "갤러리아" },
  { pattern: /갤러리아타임월드/giu, replacement: "갤러리아 타임월드" },
  { pattern: /에버랜드리조트/giu, replacement: "에버랜드" },
];

/** Common Korean place typos → canonical label before geocode. */
export function normalizePlaceLabel(text?: string | null): string {
  const hay = text?.trim();
  if (!hay) {
    return "";
  }
  let next = hay.replace(/\s+/g, " ");
  for (const rule of TYPO_REPLACEMENTS) {
    next = next.replace(rule.pattern, rule.replacement);
  }
  return next.trim();
}
