import { callOpenAiText } from "@/lib/llm/openai-json-client";
import { copy } from "@/lib/copy/human-ko";
import type { ComposeIntentMessage, IntentState } from "@/lib/portal/compose-intent/intent-state-types";
import { parseMarketProductFromText } from "@/lib/globe/market/parse-market-product-from-text";
import { isValidMarketProductName } from "@/lib/globe/market/sanitize-market-product-name";
import type { SellItemDraft } from "@/lib/portal/compose-draft/types";
import {
  buildComposeChatPersonaPrompt,
  COMPOSE_CHAT_TEMPERATURE,
} from "@/lib/portal/compose-chat/compose-chat-persona";
import { formatComposeHistoryForLlm } from "@/lib/portal/compose-chat/format-compose-history";

function fallbackConversationalReply(input: {
  intentStage: IntentState;
  newMessage: string;
  draft?: Partial<SellItemDraft>;
}): string {
  const text = input.newMessage.trim();
  const product = parseMarketProductFromText(text).productName;
  const hasProduct = isValidMarketProductName(product);

  if (input.intentStage.stage === "chatting") {
    if (/(?:핸드폰|아이폰|폰)/iu.test(text) && /(?:오래|오래됐|오래돼)/iu.test(text)) {
      return copy.portal.composeIntentChatPhoneAge;
    }
    return copy.portal.composeIntentChatDefault;
  }

  if (input.intentStage.stage === "soft_signal") {
    if (hasProduct && /(?:얼마|시세|값)/iu.test(text)) {
      return copy.portal.composeIntentSoftPriceHint(product);
    }
    if (hasProduct) {
      return copy.portal.composeIntentSoftProductHint(product);
    }
    return copy.portal.composeIntentSoftDefault;
  }

  if (sellItemDraftCanPublishFallback(input.draft)) {
    return copy.portal.composeDraftReadyToSubmit;
  }
  return copy.portal.composeDraftPartial;
}

function sellItemDraftCanPublishFallback(draft?: Partial<SellItemDraft>): boolean {
  return Boolean(draft?.productName?.trim() && draft.priceKrw != null && draft.priceKrw >= 10_000);
}

async function generateConversationalReplyLlm(input: {
  intentStage: IntentState;
  history: ComposeIntentMessage[];
  newMessage: string;
  draft?: Partial<SellItemDraft>;
}): Promise<string | null> {
  const confirmedStage: IntentState =
    input.intentStage.stage === "confirmed"
      ? input.intentStage
      : { stage: "confirmed", resourceType: "sell_item" };

  const stageForPrompt =
    input.draft && Object.keys(input.draft).length > 0
      ? confirmedStage
      : input.intentStage;

  return callOpenAiText({
    systemPrompt: buildComposeChatPersonaPrompt({
      intentStage: stageForPrompt,
      draft: input.draft,
    }),
    userText: formatComposeHistoryForLlm(input.history, input.newMessage),
    temperature: COMPOSE_CHAT_TEMPERATURE,
    maxTokens: 120,
  });
}

/**
 * Persona-based chat reply — separate from slot extraction.
 * temperature 0.8, full history, plain text (not JSON).
 */
export async function generateConversationalReply(input: {
  intentStage: IntentState;
  history: ComposeIntentMessage[];
  newMessage: string;
  draft?: Partial<SellItemDraft>;
}): Promise<string> {
  const llm = await generateConversationalReplyLlm(input);
  if (llm) {
    return llm;
  }
  return fallbackConversationalReply({
    intentStage: input.intentStage,
    newMessage: input.newMessage,
    draft: input.draft,
  });
}
