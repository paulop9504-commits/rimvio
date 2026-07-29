import { classifyPinDomainFromText } from "@/lib/globe/classify-pin-domain";
import {
  resolveMarketCategoryId,
} from "@/lib/globe/market/market-category-registry";
import { DEFAULT_MARKET_INTENT_DETAIL } from "@/lib/globe/market/market-intent-detail";
import { parseMarketProductFromText } from "@/lib/globe/market/parse-market-product-from-text";
import { sanitizeMarketProductNameFromParse } from "@/lib/globe/market/sanitize-market-product-name";
import type {
  MarketIntentDraft,
  MarketIntentRole,
} from "@/lib/globe/market/market-intent-types";

const SEEKING_SIGNAL =
  /(?:삽니다|구합니다|구해|구함|구하기|구매|구입|찾아요|찾습니다|사고\s*싶|살만|사줄|찾아\s*줘|찾아줘|wanted)/u;
const LISTING_SIGNAL = /(?:팝니다|팔아|판매|나눔|양도|내놓기|sell)/u;

function readRole(text: string): MarketIntentRole {
  const trimmed = text.trim();
  if (SEEKING_SIGNAL.test(trimmed)) {
    return "seeking";
  }
  if (LISTING_SIGNAL.test(trimmed)) {
    return "listing";
  }
  return "listing";
}

function parseAllPricesKrw(text: string): number[] {
  const matches = [...text.matchAll(/(\d{1,3}(?:,\d{3})+|\d+)\s*(만\s*)?원?/gu)];
  const values: number[] = [];
  for (const match of matches) {
    if (!match[1]) {
      continue;
    }
    const raw = match[1].replace(/,/g, "");
    const value = Number.parseInt(raw, 10);
    if (!Number.isFinite(value)) {
      continue;
    }
    const scaled = /만\s*원?/u.test(match[0]) ? value * 10_000 : value;
    if (scaled >= 10_000) {
      values.push(scaled);
    }
  }
  return values;
}

function parsePriceKrw(raw: string): number | null {
  const values = parseAllPricesKrw(raw);
  if (values.length === 0) {
    return null;
  }
  return values[values.length - 1] ?? null;
}

function resolvePriceRange(
  text: string,
  slotPrice: number | null,
): { priceMinKrw: number | null; priceMaxKrw: number | null } {
  const trimmed = text.trim();
  const parsed = parsePriceKrw(trimmed);
  const base =
    parsed !== null
      ? parsed
      : slotPrice !== null && slotPrice >= 10_000
        ? slotPrice
        : null;
  if (base === null) {
    return { priceMinKrw: null, priceMaxKrw: null };
  }

  if (/이하|까지|미만|under|max/iu.test(trimmed)) {
    return { priceMinKrw: null, priceMaxKrw: base };
  }
  if (/이상|부터|over|min/iu.test(trimmed)) {
    return { priceMinKrw: base, priceMaxKrw: null };
  }
  const range = trimmed.match(
    /(\d{1,3}(?:,\d{3})+|\d+)\s*(?:만)?\s*[-~]\s*(\d{1,3}(?:,\d{3})+|\d+)\s*(?:만)?/u,
  );
  if (range) {
    const low = parsePriceKrw(range[0]);
    const high = parsePriceKrw(range[0].split(/[-~]/u)[1] ?? "");
    if (low !== null && high !== null) {
      return {
        priceMinKrw: Math.min(low, high),
        priceMaxKrw: Math.max(low, high),
      };
    }
  }
  return { priceMinKrw: base, priceMaxKrw: base };
}


/** Text → draft slots (before Memory/GPS prefill). */
export function normalizeMarketIntentFromText(input: {
  text: string;
  eventId: string;
}): MarketIntentDraft | null {
  const text = input.text.trim();
  if (!text) {
    return null;
  }
  const classified = classifyPinDomainFromText(text);
  if (classified.inferredDomainId !== "market") {
    return null;
  }

  const slotPrice =
    typeof classified.slots.priceKrw === "number"
      ? classified.slots.priceKrw
      : null;
  const categoryId = resolveMarketCategoryId(text);
  const role = readRole(text);
  const { priceMinKrw, priceMaxKrw } = resolvePriceRange(text, slotPrice);
  const parsed = parseMarketProductFromText(text);
  const productName = sanitizeMarketProductNameFromParse(parsed.productName);

  return {
    eventId: input.eventId,
    role,
    categoryId,
    title: productName,
    priceMinKrw,
    priceMaxKrw,
    radiusKm: 5,
    anchorLat: 0,
    anchorLng: 0,
    placeLabel: "",
    peakHour: null,
    prefillSources: [],
    detail: {
      ...DEFAULT_MARKET_INTENT_DETAIL,
      sourceText: parsed.sourceText,
      productName,
      priceNegotiable: role === "seeking" && priceMinKrw === null && priceMaxKrw !== null,
      prioritySlots: {},
      prioritySchemaVersion: "market.v1.2",
    },
  };
}
