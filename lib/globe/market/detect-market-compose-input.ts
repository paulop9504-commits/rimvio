import { parseActionMention } from "@/lib/event-kernel/action-contracts/parse-action-mention";
import { resolveMentionFeature } from "@/lib/event-kernel/action-contracts/mention-feature-registry";
import { normalizeAtMentionInput } from "@/lib/command-os/parse-command-input";
import { detectLodgingSearchIntent } from "@/lib/globe/lodging/detect-lodging-search-intent";
import { parseMarketProductFromText } from "@/lib/globe/market/parse-market-product-from-text";
import { isValidMarketProductName } from "@/lib/globe/market/sanitize-market-product-name";

const FOOD_ENTITY = /(?:맛집|식당|레스토랑|음식점|카페|브런치|food|dining|cafe)/iu;
const FOOD_NEED = /(?:찾|추천|알려|골라|어디|갈|need|search)/iu;

const MARKET_SIGNAL =
  /(?:팔아|판매|삽니다|팝니다|중고|거래|나눔|양도|구매|구입|내놓기|구하기)/u;
const NATURAL_MARKET_ROLE =
  /(?:팔고\s*싶|팔래|팔아요?|내놓|양도|나눔|사고\s*싶|구해요?|구합니다|삽니다|구입하고\s*싶)/u;
const PRICE_SIGNAL = /(?:(\d{1,3}(?:,\d{3})+|\d+)\s*(?:만\s*)?원)/u;

function readBareMentionToken(raw: string): string | null {
  const trimmed = normalizeAtMentionInput(raw);
  if (!trimmed.startsWith("@")) {
    return null;
  }
  const match = trimmed.match(/^@(\S+)\s*$/u);
  return match?.[1]?.trim() || null;
}

/** `@중고` mention path — unchanged SSOT. */
export function isMentionMarketComposeInput(raw: string): boolean {
  const bareToken = readBareMentionToken(raw);
  if (bareToken) {
    return resolveMentionFeature(bareToken)?.featureId === "market";
  }
  const mention = parseActionMention(raw.trim());
  return mention?.feature.featureId === "market";
}

function isEaterySearchIntent(text: string): boolean {
  return FOOD_ENTITY.test(text) && FOOD_NEED.test(text);
}

/**
 * Natural language market intent — no @ required.
 * Conservative: role or price + product; never steals lodging/eatery.
 */
export function detectNaturalMarketComposeInput(raw: string): boolean {
  const text = raw.trim();
  if (!text || text.startsWith("@")) {
    return false;
  }
  if (detectLodgingSearchIntent(text)) {
    return false;
  }
  if (isEaterySearchIntent(text)) {
    return false;
  }

  const product = parseMarketProductFromText(text).productName;
  const hasProduct = isValidMarketProductName(product);
  const hasRole = NATURAL_MARKET_ROLE.test(text) || MARKET_SIGNAL.test(text);
  const hasPrice = PRICE_SIGNAL.test(text);

  if (hasProduct && (hasRole || hasPrice)) {
    return true;
  }
  if (hasRole && /(?:중고|거래|내놓기|구하기)/u.test(text)) {
    return true;
  }
  return false;
}

function detectNaturalMarketBareIntent(raw: string): boolean {
  const text = raw.trim();
  if (!text || text.startsWith("@")) {
    return false;
  }
  if (!detectNaturalMarketComposeInput(text)) {
    return false;
  }
  const product = parseMarketProductFromText(text).productName;
  return !isValidMarketProductName(product);
}

/** Composer market path — @ mention or natural language. */
export function isMarketComposeInput(raw: string): boolean {
  return isMentionMarketComposeInput(raw) || detectNaturalMarketComposeInput(raw);
}

export function readMarketComposeQuery(raw: string): string {
  if (readBareMentionToken(raw)) {
    return "";
  }
  const mention = parseActionMention(raw.trim());
  if (mention?.feature.featureId === "market") {
    return mention.query.trim();
  }
  const product = parseMarketProductFromText(raw).productName;
  return isValidMarketProductName(product) ? product : "";
}

/** Role-only market — Portal pick before wizard. */
export function isBareMarketComposeInput(raw: string): boolean {
  if (isMentionMarketComposeInput(raw) && readMarketComposeQuery(raw).length === 0) {
    return true;
  }
  return detectNaturalMarketBareIntent(raw);
}
