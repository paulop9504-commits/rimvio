import { normalizeMarketIntentFromText } from "@/lib/globe/market/normalize-market-intent-from-text";
import { parseMarketPlaceFromText } from "@/lib/globe/market/parse-market-place-from-text";
import { parseMarketProductFromText } from "@/lib/globe/market/parse-market-product-from-text";
import { isValidMarketProductName } from "@/lib/globe/market/sanitize-market-product-name";
import { mergeComposeDraft } from "@/lib/portal/compose-draft/draft-utils";
import type { ComposeSlotId } from "@/lib/portal/compose-draft/product-category-types";
import type { SellItemDraft } from "@/lib/portal/compose-draft/types";

const PRICE_SIGNAL = /(\d{1,3}(?:,\d{3})+|\d+)\s*(?:만\s*)?원/u;
const STORAGE_SIGNAL = /(\d+)\s*(?:gb|tb|기가)/iu;
const SKIP_NOTE = /^(?:없어|없음|패스|skip|\.|-)$/iu;
const BATTERY_SIGNAL = /(?:배터리|성능)\s*(\d{1,3})\s*%?/iu;

export type SlotExtras = Partial<Record<ComposeSlotId, string>>;

function parsePriceKrw(text: string): number | null {
  const normalized = normalizeMarketIntentFromText({
    text: text.trim(),
    eventId: "probe",
  });
  const fromNorm = normalized?.priceMinKrw ?? normalized?.priceMaxKrw ?? null;
  if (fromNorm != null && fromNorm >= 10_000) {
    return fromNorm;
  }
  const match = text.match(PRICE_SIGNAL);
  if (!match?.[1]) {
    return null;
  }
  const raw = match[1].replace(/,/g, "");
  let value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) {
    return null;
  }
  if (/만/u.test(text) && value < 10_000) {
    value *= 10_000;
  }
  return value >= 10_000 ? value : null;
}

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

/** Parse a single slot answer — one field per turn. */
export function parseSlotAnswer(
  slotId: ComposeSlotId,
  rawText: string,
): { draft: Partial<SellItemDraft>; extras: SlotExtras; skipped: boolean } {
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
      const priceKrw = parsePriceKrw(text);
      return priceKrw != null ? { draft: { priceKrw }, extras: {}, skipped: false } : { draft: {}, extras: {}, skipped: false };
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
      const storage = match ? text.trim() : text.trim();
      return { draft: {}, extras: { storage }, skipped: false };
    }
    case "cpuRam":
      return { draft: {}, extras: { cpuRam: text.slice(0, 120) }, skipped: false };
    case "sizeLabel":
      return { draft: {}, extras: { sizeLabel: text.slice(0, 40) }, skipped: false };
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
  if (noteParts.length > 0) {
    const mergedNote = [draft.note?.trim(), noteParts.join(" · ")].filter(Boolean).join("\n");
    next = mergeComposeDraft(next, { note: mergedNote || null });
  }
  return next;
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
