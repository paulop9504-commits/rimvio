const MENTION_TOKEN = /^@\S+$/u;
const MARKET_NOISE = /^(?:중고|used|market|내놓기|찾기|구함)$/iu;

/** Parsed or typed name safe to show as product title (not @중고 alone). */
export function isValidMarketProductName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return false;
  }
  if (MENTION_TOKEN.test(trimmed)) {
    return false;
  }
  if (MARKET_NOISE.test(trimmed)) {
    return false;
  }
  if (/^@\S+/u.test(trimmed)) {
    return false;
  }
  return true;
}

/** Strip unusable parser output before prefill. */
export function sanitizeMarketProductNameFromParse(name: string): string {
  return isValidMarketProductName(name) ? name.trim() : "";
}
