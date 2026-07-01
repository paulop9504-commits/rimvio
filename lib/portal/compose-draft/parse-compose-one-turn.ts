import { parseMarketPlaceFromText } from "@/lib/globe/market/parse-market-place-from-text";
import { parseMarketProductFromText } from "@/lib/globe/market/parse-market-product-from-text";
import { isValidMarketProductName } from "@/lib/globe/market/sanitize-market-product-name";
import { normalizeMarketIntentFromText } from "@/lib/globe/market/normalize-market-intent-from-text";
import { parseComposePriceKrwOrNull } from "@/lib/portal/compose-draft/parse-compose-price-krw";
import type { SlotExtras } from "@/lib/portal/compose-draft/parse-slot-answer";
import type { SellItemDraft } from "@/lib/portal/compose-draft/types";
import { isConditionOnlyProductName } from "@/lib/portal/compose-intent/compose-intent-context";

const VAGUE_PRODUCT_NAME = /^(?:물건|물품|상품|제품|것|거|옷|가구)$/iu;

const STORAGE_SIGNAL = /(\d+)\s*(?:gb|tb|기가)/iu;
const SIZE_SIGNAL = /\b(XXS|XS|S|M|L|XL|XXL|FREE|프리)\b/iu;
const CPU_RAM_SIGNAL =
  /(?:\d+\s*(?:gb|tb|기가)|(?:m[1-9]|i[3579]|ryzen|core\s*i\d)|(?:ram|램|ssd|cpu))/iu;

const DEVICE_PRODUCT =
  /((?:아이폰|iphone|갤럭시|galaxy|에어팟|airpods|맥북|macbook|아이패드|ipad|핸드폰|폰|노트북)(?:\s*(?:pro|max|mini|플러스|\+)?[\d\w.-]*)?)/iu;

export type ComposeOneTurnParse = {
  draft: Partial<SellItemDraft>;
  extras: SlotExtras;
};

function stripIntentTail(text: string): string {
  return text
    .replace(
      /(?:팔고|내놓고|팔래|팔려고|구하고|구해요)(?:\s+싶어요?)?\s*$/giu,
      "",
    )
    .replace(/(?:하고\s*싶어요?|싶어요?|싶은|할래요?)\s*$/giu, "")
    .trim();
}

function sanitizeProductName(name: string | undefined | null): string | null {
  const trimmed = name?.trim() ?? "";
  if (!trimmed || VAGUE_PRODUCT_NAME.test(trimmed)) {
    return null;
  }
  if (!isValidMarketProductName(trimmed)) {
    return trimmed.length >= 2 ? trimmed : null;
  }
  return trimmed;
}

function extractEmbeddedProductName(text: string): string | null {
  const match = text.match(DEVICE_PRODUCT);
  if (!match?.[1]) {
    return null;
  }
  return sanitizeProductName(match[1].trim());
}

/** Condition phrases — colloquial Korean + grades + battery. */
export function parseConditionFromComposeText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const battery = trimmed.match(/(?:배터리|성능)\s*(\d{1,3})\s*%?/iu);
  if (battery?.[1]) {
    return `배터리 ${battery[1]}%`;
  }

  if (/사용감\s*(?:있음|있어|있는|有)/iu.test(trimmed)) {
    return "사용감 있음";
  }
  if (/거의\s*새(?:것|거)?/iu.test(trimmed)) {
    return "거의 새것";
  }
  if (/미(?:개봉|사용|개봉품)/iu.test(trimmed)) {
    return "미개봉";
  }
  if (/(?:S|에스)\s*급/iu.test(trimmed)) {
    return "S급";
  }
  if (/(?:A|에이)\s*급/iu.test(trimmed)) {
    return "A급";
  }
  if (/(?:B|비)\s*급/iu.test(trimmed)) {
    return "B급";
  }
  if (/깨끗(?:함|해|한)?/iu.test(trimmed)) {
    return "깨끗함";
  }

  const statePhrase = trimmed.match(/상태\s*(?:는|가)?\s*([^\n,.!?]{2,40})/iu);
  if (statePhrase?.[1]) {
    const fragment = statePhrase[1].trim();
    if (fragment.length >= 2) {
      return fragment.startsWith("상태") ? fragment : `상태 ${fragment}`;
    }
  }

  if (/(?:\d+)\s*년\s*(?:쓴|사용|됨)/iu.test(trimmed)) {
    const years = trimmed.match(/(\d+)\s*년\s*(?:쓴|사용|됨)/iu);
    return years ? `사용 ${years[1]}년` : "중고";
  }
  if (/새\s*것|새거/iu.test(trimmed)) {
    return "새것";
  }
  if (/중고/iu.test(trimmed)) {
    return "중고";
  }
  if (/상태\s*(?:좋|양호|최상|괜찮)/iu.test(trimmed)) {
    return "상태 좋음";
  }
  if (/^(?:좋아|좋음|괜찮|나쁘지)/iu.test(trimmed)) {
    return "상태 좋음";
  }

  return null;
}

export function parseSlotExtrasFromComposeText(text: string): SlotExtras {
  const extras: SlotExtras = {};
  const storage = text.match(STORAGE_SIGNAL);
  if (storage?.[0]) {
    extras.storage = storage[0].trim();
  }
  if (CPU_RAM_SIGNAL.test(text)) {
    const cpuLine = text.match(
      /(?:m[1-9][^\n,.!?]{0,24}|i[3579][^\n,.!?]{0,24}|ryzen[^\n,.!?]{0,24})/iu,
    );
    extras.cpuRam = (cpuLine?.[0] ?? text).slice(0, 120).trim();
  }
  const size = text.match(SIZE_SIGNAL);
  if (size?.[1]) {
    extras.sizeLabel = size[1].toUpperCase() === "프리" ? "FREE" : size[1].toUpperCase();
  }
  return extras;
}

/**
 * Rules-only one-turn parse — product · price · condition · place · extras.
 * Safe on combined accumulated + incoming text.
 */
export function parseComposeOneTurn(rawText: string): ComposeOneTurnParse {
  const text = rawText.trim();
  if (!text) {
    return { draft: {}, extras: {} };
  }

  const stripped = stripIntentTail(text);
  const draft: Partial<SellItemDraft> = {};

  const embedded = extractEmbeddedProductName(stripped);
  const parsed = parseMarketProductFromText(stripped);
  let productName = embedded ?? sanitizeProductName(parsed.productName);
  if (productName && isConditionOnlyProductName(productName)) {
    productName = null;
  }
  if (!productName && /(?:핸드폰|폰)/iu.test(stripped) && /(?:팔|판매|내놓|양도)/iu.test(text)) {
    productName = "핸드폰";
  }
  if (productName && productName.length <= 80) {
    draft.productName = productName;
  }

  const normalized = normalizeMarketIntentFromText({ text, eventId: "probe" });
  const price = parseComposePriceKrwOrNull(text) ?? normalized?.priceMinKrw ?? null;
  if (price != null && price >= 10_000) {
    draft.priceKrw = price;
  }

  const condition = parseConditionFromComposeText(text);
  if (condition) {
    draft.condition = condition;
  }

  const place = parseMarketPlaceFromText(text)?.trim();
  if (place) {
    draft.placeLabel = place;
  }

  if (normalized?.role) {
    draft.role = normalized.role;
  }

  return {
    draft,
    extras: parseSlotExtrasFromComposeText(text),
  };
}
