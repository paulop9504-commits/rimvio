import { parseMarketPlaceFromText } from "@/lib/globe/market/parse-market-place-from-text";
import { parseMarketProductFromText } from "@/lib/globe/market/parse-market-product-from-text";
import { isValidMarketProductName } from "@/lib/globe/market/sanitize-market-product-name";
import { mergeComposeDraft } from "@/lib/portal/compose-draft/draft-utils";
import { parseComposePriceKrw } from "@/lib/portal/compose-draft/parse-compose-price-krw";
import type { ComposeSlotId } from "@/lib/portal/compose-draft/product-category-types";
import type { SellItemDraft } from "@/lib/portal/compose-draft/types";

const STORAGE_SIGNAL = /(\d+)\s*(?:gb|tb|기가)/iu;
const SIZE_SIGNAL = /\b(XXS|XS|S|M|L|XL|XXL|FREE)\b/iu;
const CPU_RAM_SIGNAL =
  /(?:\d+\s*(?:gb|tb|기가)|(?:m[1-9]|i[3579]|ryzen|core\s*i\d)|(?:ram|램|ssd|cpu))/iu;
const SKIP_NOTE = /^(?:없어|없음|패스|skip|\.|-)$/iu;
const BATTERY_SIGNAL = /(?:배터리|성능)\s*(\d{1,3})\s*%?/iu;

export type SlotExtras = Partial<Record<ComposeSlotId, string>>;

const VAGUE_PRODUCT_NAME = /^(?:물건|물품|상품|제품|것|거|핸드폰|폰|노트북|옷|가구)$/iu;

function sanitizeProductName(text: string): string | null {
  const parsed = parseMarketProductFromText(text.trim());
  const name = parsed.productName?.trim() ?? "";
  if (!name || VAGUE_PRODUCT_NAME.test(name)) {
    return null;
  }
  if (!isValidMarketProductName(name)) {
    return null;
  }
  return name;
}

export type SlotAnswerResult = {
  draft: Partial<SellItemDraft>;
  extras: SlotExtras;
  skipped: boolean;
};

function parsePriceSlotAnswer(text: string): Pick<SlotAnswerResult, "draft"> {
  const parsed = parseComposePriceKrw(text);
  if (parsed.ok) {
    return { draft: { priceKrw: parsed.priceKrw } };
  }
  return { draft: {} };
}

/** Parse a single slot answer — one field per turn. */
export function parseSlotAnswer(
  slotId: ComposeSlotId,
  rawText: string,
): SlotAnswerResult {
  const text = rawText.trim();
  if (!text) {
    if (slotId === "note") {
      return { draft: {}, extras: { note: "" }, skipped: true };
    }
    return { draft: {}, extras: {}, skipped: false };
  }

  if (slotId === "note" && SKIP_NOTE.test(text)) {
    return { draft: {}, extras: { note: "" }, skipped: true };
  }

  switch (slotId) {
    case "productName": {
      const productName = sanitizeProductName(text) ?? text.slice(0, 80);
      return { draft: { productName }, extras: {}, skipped: false };
    }
    case "priceKrw": {
      const price = parsePriceSlotAnswer(text);
      return {
        draft: price.draft,
        extras: {},
        skipped: false,
      };
    }
    case "condition": {
      const battery = text.match(BATTERY_SIGNAL);
      const condition = battery ? text.trim() : text.trim();
      return { draft: { condition }, extras: {}, skipped: false };
    }
    case "placeLabel": {
      const place = parseMarketPlaceFromText(text)?.trim() || text.slice(0, 80);
      return { draft: { placeLabel: place }, extras: {}, skipped: false };
    }
    case "storage": {
      const match = text.match(STORAGE_SIGNAL);
      if (!match) {
        return { draft: {}, extras: {}, skipped: false };
      }
      return { draft: {}, extras: { storage: match[0].trim() }, skipped: false };
    }
    case "cpuRam": {
      if (!CPU_RAM_SIGNAL.test(text)) {
        return { draft: {}, extras: {}, skipped: false };
      }
      return { draft: {}, extras: { cpuRam: text.slice(0, 120).trim() }, skipped: false };
    }
    case "sizeLabel": {
      const match = text.match(SIZE_SIGNAL);
      if (!match?.[1]) {
        return { draft: {}, extras: {}, skipped: false };
      }
      return {
        draft: {},
        extras: { sizeLabel: match[1].toUpperCase() },
        skipped: false,
      };
    }
    case "note":
      return { draft: { note: text.slice(0, 500) }, extras: { note: text }, skipped: false };
    default:
      return { draft: {}, extras: {}, skipped: false };
  }
}

const INTENT_TAIL =
  /(?:팔고?\s*싶|팔꺼|팔래|내놓|양도|구해|구하고|구합니다|판매할)/iu;

const DEVICE_PRODUCT =
  /((?:아이폰|iphone|갤럭시|galaxy|에어팟|airpods|맥북|macbook|아이패드|ipad)(?:\s*(?:pro|max|mini|플러스|\+)?[\d\w.-]*)?)/iu;

function extractEmbeddedProductName(text: string): string | null {
  const match = text.match(DEVICE_PRODUCT);
  if (!match?.[1]) {
    return null;
  }
  const name = match[1].trim();
  if (VAGUE_PRODUCT_NAME.test(name)) {
    return null;
  }
  if (!isValidMarketProductName(name)) {
    return name.length >= 2 ? name : null;
  }
  return name;
}

/** Narrow first-pass extraction — product name only (no bulk slot fill). */
export function extractProductNameFromMessage(text: string): Partial<SellItemDraft> {
  const trimmed = text.trim();
  if (!trimmed) {
    return {};
  }

  const embedded = extractEmbeddedProductName(trimmed);
  if (embedded) {
    return { productName: embedded };
  }

  const productName = sanitizeProductName(trimmed);
  if (!productName) {
    return {};
  }

  if (INTENT_TAIL.test(trimmed) && productName.length / trimmed.length > 0.55) {
    return {};
  }

  if (trimmed.length > 12 && productName === trimmed) {
    return {};
  }

  return { productName };
}

export function mergeSlotExtrasIntoDraft(
  draft: Partial<SellItemDraft>,
  extras: SlotExtras,
): Partial<SellItemDraft> {
  let next = { ...draft };
  const noteParts: string[] = [];

  if (extras.storage?.trim()) {
    noteParts.push(`용량 ${extras.storage.trim()}`);
  }
  if (extras.cpuRam?.trim()) {
    noteParts.push(`사양 ${extras.cpuRam.trim()}`);
  }
  if (extras.sizeLabel?.trim()) {
    noteParts.push(`사이즈 ${extras.sizeLabel.trim()}`);
  }
  if (noteParts.length === 0) {
    return next;
  }

  const extraLine = noteParts.join(" · ");
  const userNote = stripAutoMergedSlotExtraNote(draft.note);
  const mergedNote = [userNote, extraLine].filter(Boolean).join("\n");
  next = mergeComposeDraft(next, { note: mergedNote || null });
  return next;
}

function stripAutoMergedSlotExtraNote(note: string | null | undefined): string {
  if (!note?.trim()) {
    return "";
  }
  return note
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 &&
        !/^용량\s+.+\s*·\s*사양\s+.+\s*·\s*사이즈\s+/u.test(line),
    )
    .join("\n")
    .trim();
}

export function isSlotFilled(
  slotId: ComposeSlotId,
  draft: Partial<SellItemDraft>,
  extras: SlotExtras,
  skippedSlots: ReadonlySet<ComposeSlotId>,
): boolean {
  if (skippedSlots.has(slotId)) {
    return true;
  }
  switch (slotId) {
    case "productName":
      return Boolean(draft.productName?.trim());
    case "priceKrw":
      return draft.priceKrw != null && draft.priceKrw >= 10_000;
    case "condition":
      return Boolean(draft.condition?.trim());
    case "placeLabel":
      return Boolean(draft.placeLabel?.trim());
    case "note":
      return Boolean(draft.note?.trim()) || skippedSlots.has("note");
    case "storage":
      return Boolean(extras.storage?.trim()) || skippedSlots.has("storage");
    case "cpuRam":
      return Boolean(extras.cpuRam?.trim()) || skippedSlots.has("cpuRam");
    case "sizeLabel":
      return Boolean(extras.sizeLabel?.trim()) || skippedSlots.has("sizeLabel");
    default:
      return false;
  }
}
