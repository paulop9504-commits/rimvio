import { callOpenAiText } from "@/lib/llm/openai-json-client";
import { copy } from "@/lib/copy/human-ko";
import type { ComposeIntentMessage, IntentState } from "@/lib/portal/compose-intent/intent-state-types";
import { parseMarketProductFromText } from "@/lib/globe/market/parse-market-product-from-text";
import { isValidMarketProductName } from "@/lib/globe/market/sanitize-market-product-name";
import type { SellItemDraft } from "@/lib/portal/compose-draft/types";
import { findNextFlowStep } from "@/lib/portal/compose-draft/flow-step-types";
import { SELL_ITEM_FLOW, sellItemFlowReadyToPublish } from "@/lib/portal/compose-draft/sell-item-flow";
import {
  buildComposeChatPersonaPrompt,
  COMPOSE_CHAT_TEMPERATURE,
} from "@/lib/portal/compose-chat/compose-chat-persona";
import { formatComposeHistoryForLlm } from "@/lib/portal/compose-chat/format-compose-history";
import { readProductLabelFromComposeContext } from "@/lib/portal/compose-intent/compose-intent-context";

function fallbackConversationalReply(input: {
  intentStage: IntentState;
  newMessage: string;
  history: ComposeIntentMessage[];
  draft?: Partial<SellItemDraft>;
}): string {
  const text = input.newMessage.trim();
  const product =
    readProductLabelFromComposeContext({
      history: input.history,
      newMessage: input.newMessage,
    }) ?? "";
  const hasProduct = isValidMarketProductName(product);

  if (input.intentStage.stage === "chatting") {
    if (/^(?:ㅎㅇ|하이|헬로|hello|hi)$/iu.test(text)) {
      return copy.portal.composeIntentChatGreetingShort;
    }
    if (/(?:안녕|반가)/iu.test(text)) {
      return copy.portal.composeIntentChatGreeting;
    }
    if (/(?:바빴|바빠|힘들|피곤|고생|지쳤)/iu.test(text)) {
      return copy.portal.composeIntentChatEmpathy;
    }
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

  if (input.intentStage.stage === "confirmed" && input.draft) {
    const next = findNextFlowStep(input.draft, SELL_ITEM_FLOW.slice(0, -1));
    if (next?.slotKey === "photos") {
      return copy.portal.composeDraftNudgePhoto;
    }
    if (next?.slotKey === "note") {
      return copy.portal.composeDraftNudgeDescription;
    }
    if (sellItemFlowReadyToPublish(input.draft)) {
      return copy.portal.composeDraftReadyToSubmit;
    }
    return copy.portal.composeDraftPartial;
  }

  if (sellItemDraftCanPublishFallback(input.draft)) {
    return copy.portal.composeDraftNudgePhoto;
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
  memoryNotesKo?: string | null;
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
      memoryNotesKo: input.memoryNotesKo,
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
  memoryNotesKo?: string | null;
}): Promise<string> {
  const llm = await generateConversationalReplyLlm(input);
  if (llm) {
    return llm;
  }
  return fallbackConversationalReply({
    intentStage: input.intentStage,
    newMessage: input.newMessage,
    history: input.history,
    draft: input.draft,
  });
}
