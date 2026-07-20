/**
 * Negation / contrast rewrite — fallback when multi-intent atom parse is not used.
 * Prefer parseNlIntentChain for reject+keep (preserves reject polarity).
 */

/**
 * 「아니 그거 말고 두 번째」→ 「두 번째」
 * 「예약은 말고 길만」→ 「길 찾아」
 */
export function normalizeNlNegation(utterance: string): string {
  let text = utterance.trim().replace(/\s+/gu, " ");
  if (!text) {
    return text;
  }

  // 「아니(요) 그거 말고 …」 / 「그거 말고 …」
  const instead = text.match(
    /^(?:아니(?:요|야|오)?\s*)?(?:그거|이거|저거|그것|이것|저것)?\s*말고\s+(.+)$/iu,
  );
  if (instead?.[1]?.trim()) {
    text = instead[1].trim();
  }

  // 「예약은 말고 길만 / 길 찾아」
  if (
    /예약(?:은|을|이)?\s*말고/iu.test(text) &&
    /길|내비|지도|택시|지하철|도보/iu.test(text)
  ) {
    text = text
      .replace(/예약(?:은|을|이)?\s*말고\s*/iu, "")
      .replace(/\s*만\s*$/u, "")
      .trim();
    if (!/(?:길|내비|지도|찾아)/iu.test(text)) {
      text = `${text} 길 찾아`.trim();
    }
  }

  // 「공유는 말고 예약」
  if (
    /공유(?:는|을|이)?\s*말고/iu.test(text) &&
    /예약|잡아|결제/iu.test(text)
  ) {
    text = text.replace(/공유(?:는|을|이)?\s*말고\s*/iu, "").trim();
  }

  // 「길만」 alone after strip
  if (/^길만$/iu.test(text) || /^길$/iu.test(text)) {
    return "길 찾아";
  }

  return text;
}
