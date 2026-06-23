import { sanitizeMarketProductNameFromParse } from "@/lib/globe/market/sanitize-market-product-name";

const MENTION_PREFIX = /^@\S+\s*/u;
const ALL_MENTIONS = /@\S+/gu;
const ROLE_NOISE =
  /(?:삽니다|구합니다|구해요?|구함|찾아요|찾습니다|팝니다|팔아요?|판매|나눔|양도|sell|wanted)/giu;
const RANGE_NOISE =
  /(\d{1,3}(?:,\d{3})+|\d+)\s*(?:만)?\s*[-~]\s*(\d{1,3}(?:,\d{3})+|\d+)\s*(?:만)?/giu;

function stripPriceTokens(text: string): string {
  return text.replace(
    /(\d{1,3}(?:,\d{3})+|\d+)\s*(만\s*)?원?(?:\s*이하|\s*이상|\s*까지|\s*부터)?/giu,
    (match) => {
      const num = match.match(/(\d{1,3}(?:,\d{3})+|\d+)/u)?.[1]?.replace(/,/g, "");
      if (!num) {
        return match;
      }
      const value = Number.parseInt(num, 10);
      if (!Number.isFinite(value)) {
        return match;
      }
      const scaled = /만\s*원?/u.test(match) ? value * 10_000 : value;
      return scaled >= 10_000 ? " " : match;
    },
  );
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/gu, " ").trim();
}

/** Deterministic text → product name (composer / @중고 prefill). */
export function parseMarketProductFromText(text: string): {
  productName: string;
  sourceText: string;
} {
  const sourceText = text.trim();
  let working = sourceText.replace(MENTION_PREFIX, "");
  working = working.replace(ALL_MENTIONS, " ");
  working = working.replace(RANGE_NOISE, " ");
  working = stripPriceTokens(working);
  working = working.replace(ROLE_NOISE, " ");
  working = collapseWhitespace(working.replace(/[·|,]+/gu, " "));

  const rawName = working.slice(0, 80);
  const productName = sanitizeMarketProductNameFromParse(rawName);
  return { productName, sourceText };
}
