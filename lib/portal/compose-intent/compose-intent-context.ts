import type { ComposeIntentMessage } from "@/lib/portal/compose-intent/intent-state-types";
import {
  parseComposeOneTurn,
  parseConditionFromComposeText,
} from "@/lib/portal/compose-draft/parse-compose-one-turn";
import { parseComposePriceKrwOrNull } from "@/lib/portal/compose-draft/parse-compose-price-krw";

const DEVICE_SIGNAL =
  /(?:핸드폰|아이폰|iphone|갤럭시|galaxy|맥북|macbook|아이패드|ipad|노트북|폰|에어팟|airpods)/iu;
const SELL_SIGNAL = /(?:팔고?\s*싶|팔래|팔아요?|내놓|양도|판매|팝니다|팔\s*생각)/iu;

/** Whole string is a condition phrase — not a product title. */
export function isConditionOnlyProductName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) {
    return false;
  }
  if (parseConditionFromComposeText(trimmed) === trimmed) {
    return true;
  }
  if (/^(?:사용감\s*있음|상태\s*좋음|거의\s*새것|S급|A급|B급)$/iu.test(trimmed)) {
    return true;
  }
  return /(?:사용감|상태|배터리|스크래치|기스|중고|새것)/iu.test(trimmed) && !DEVICE_SIGNAL.test(trimmed);
}

export function buildComposeContextText(input: {
  history: readonly ComposeIntentMessage[];
  newMessage: string;
}): string {
  const lines = input.history
    .map((message) => message.text.trim())
    .filter(Boolean);
  if (input.newMessage.trim()) {
    lines.push(input.newMessage.trim());
  }
  return lines.join(" ");
}

/** Enough substance to leave soft_signal and run slot fill. */
export function hasListingSubstanceForConfirm(contextText: string): boolean {
  const text = contextText.trim();
  if (!text) {
    return false;
  }
  if (SELL_SIGNAL.test(text)) {
    return true;
  }

  const parsed = parseComposeOneTurn(text);
  const hasPrice =
    parsed.draft.priceKrw != null && parsed.draft.priceKrw >= 10_000;
  const hasCondition = Boolean(parsed.draft.condition?.trim());
  const hasProduct = Boolean(
    parsed.draft.productName?.trim() &&
      !isConditionOnlyProductName(parsed.draft.productName),
  );
  const hasDevice = DEVICE_SIGNAL.test(text);

  if (hasPrice && (hasCondition || hasProduct || hasDevice)) {
    return true;
  }
  if (hasPrice && parseComposePriceKrwOrNull(text) != null) {
    return true;
  }
  return false;
}

export function readProductLabelFromComposeContext(input: {
  history: readonly ComposeIntentMessage[];
  newMessage: string;
}): string | null {
  const context = buildComposeContextText(input);
  const product = parseComposeOneTurn(context).draft.productName?.trim();
  if (product && !isConditionOnlyProductName(product)) {
    return product;
  }
  if (DEVICE_SIGNAL.test(context)) {
    const device = context.match(
      /(?:아이폰|iphone|갤럭시|galaxy|맥북|macbook|아이패드|ipad|에어팟|airpods)[\s\d\w.-]*/iu,
    );
    if (device?.[0]) {
      return device[0].trim();
    }
    if (/(?:핸드폰|폰)/iu.test(context)) {
      return "핸드폰";
    }
  }
  return null;
}
