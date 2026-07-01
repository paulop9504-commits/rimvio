import { callOpenAiTextJson } from "@/lib/llm/openai-json-client";
import { mergeComposeDraft } from "@/lib/portal/compose-draft/draft-utils";
import { parseComposeOneTurn } from "@/lib/portal/compose-draft/parse-compose-one-turn";
import { getComposeSchema } from "@/lib/portal/compose-draft/schema-registry";
import type {
  ComposeMessage,
  ComposeSchemaId,
  SellItemDraft,
} from "@/lib/portal/compose-draft/types";
import {
  buildComposeExtractSystemPrompt,
  COMPOSE_EXTRACT_TEMPERATURE,
} from "@/lib/portal/compose-chat/compose-chat-persona";
import { formatComposeHistoryForLlm } from "@/lib/portal/compose-chat/format-compose-history";
import { parseMarketProductFromText } from "@/lib/globe/market/parse-market-product-from-text";
import { parseMarketPlaceFromText } from "@/lib/globe/market/parse-market-place-from-text";
import { isValidMarketProductName } from "@/lib/globe/market/sanitize-market-product-name";

const VAGUE_PRODUCT_NAME = /^(?:물건|물품|상품|제품|것|거)$/iu;

function stripComposeIntentTail(text: string): string {
  return text
    .replace(
      /(?:팔고|내놓고|팔래|팔려고|구하고|구해요)(?:\s+싶어요?)?\s*$/giu,
      "",
    )
    .replace(/(?:하고\s*싶어요?|싶어요?|싶은|할래요?)\s*$/giu, "")
    .trim();
}

function sanitizeExtractedProductName(name: string | undefined | null): string | null {
  const trimmed = name?.trim() ?? "";
  if (!trimmed || VAGUE_PRODUCT_NAME.test(trimmed)) {
    return null;
  }
  if (!isValidMarketProductName(trimmed)) {
    return null;
  }
  return trimmed;
}

/** Rules-only slot extraction — no LLM (chip answers, fast prefill). */
export function extractDraftSlotsRulesOnly(text: string): Partial<SellItemDraft> {
  return parseComposeOneTurn(text).draft;
}

function extractSellItemDraftRules(text: string): Partial<SellItemDraft> {
  return parseComposeOneTurn(text).draft;
}

async function extractSellItemDraftSlotsLlm(input: {
  history: ComposeMessage[];
  currentDraft: Partial<SellItemDraft>;
  newMessage: string;
}): Promise<Partial<SellItemDraft> | null> {
  const schema = getComposeSchema("sell_item");
  const fieldList = schema.fields
    .map((field) => `${field.id}${field.required ? " (required)" : " (optional)"}`)
    .join(", ");

  const historyBlock = formatComposeHistoryForLlm(input.history, input.newMessage);

  const raw = await callOpenAiTextJson({
    systemPrompt: [
      buildComposeExtractSystemPrompt(fieldList),
      "Current draft:",
      JSON.stringify(input.currentDraft),
    ].join(" "),
    userText: historyBlock,
    temperature: COMPOSE_EXTRACT_TEMPERATURE,
  });

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SellItemDraft>;
    const patch: Partial<SellItemDraft> = {};
    if (typeof parsed.productName === "string") {
      const productName = sanitizeExtractedProductName(parsed.productName);
      if (productName) {
        patch.productName = productName;
      }
    }
    if (typeof parsed.priceKrw === "number" && parsed.priceKrw >= 10_000) {
      patch.priceKrw = Math.round(parsed.priceKrw);
    }
    if (typeof parsed.condition === "string" && parsed.condition.trim()) {
      patch.condition = parsed.condition.trim();
    }
    if (typeof parsed.placeLabel === "string" && parsed.placeLabel.trim()) {
      patch.placeLabel = parsed.placeLabel.trim();
    }
    if (typeof parsed.note === "string" && parsed.note.trim()) {
      patch.note = parsed.note.trim();
    }
    if (parsed.role === "listing" || parsed.role === "seeking") {
      patch.role = parsed.role;
    }
    return patch;
  } catch {
    return null;
  }
}

/** Extraction-only LLM pass — full history, low temperature, JSON out. */
export async function extractDraftSlots(input: {
  schemaId: ComposeSchemaId;
  history: ComposeMessage[];
  currentDraft: Partial<SellItemDraft>;
  newMessage: string;
}): Promise<Partial<SellItemDraft>> {
  const message = input.newMessage.trim();
  if (!message) {
    return {};
  }

  if (input.schemaId !== "sell_item") {
    const product = parseMarketProductFromText(stripComposeIntentTail(message));
    const patch: Partial<SellItemDraft> = {};
    const productName = sanitizeExtractedProductName(product.productName);
    if (productName) {
      patch.productName = productName;
    }
    const place = parseMarketPlaceFromText(message);
    if (place?.trim()) {
      patch.placeLabel = place.trim();
    }
    return patch;
  }

  const rulePatch = extractSellItemDraftRules(message);
  const llmPatch = await extractSellItemDraftSlotsLlm(input);
  return mergeComposeDraft(rulePatch, llmPatch ?? {});
}

/** @deprecated Use extractDraftSlots — kept for callers. */
export async function extractDraftUpdate(input: {
  schemaId: ComposeSchemaId;
  history: ComposeMessage[];
  currentDraft: Partial<SellItemDraft>;
  newMessage: string;
}): Promise<Partial<SellItemDraft>> {
  return extractDraftSlots(input);
}
