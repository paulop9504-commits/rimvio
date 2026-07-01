import { callLlmTextJson } from "@/lib/llm/text-llm-client";
import type { ComposeSchemaId } from "@/lib/portal/compose-draft/types";
import type {
  ComposeIntentMessage,
  IntentState,
} from "@/lib/portal/compose-intent/intent-state-types";
import { detectComposeSchemaFromText } from "@/lib/portal/compose-draft/schema-registry";
import {
  buildComposeContextText,
  hasListingSubstanceForConfirm,
} from "@/lib/portal/compose-intent/compose-intent-context";

const AFFIRM_SIGNAL =
  /(?:^(?:네|응|예|좋아요|그래요?|그럼|올려볼게|올릴게|등록할게|해볼게|해주세요)|올려\s*볼|등록\s*할|해볼게요)/iu;
const EXPLICIT_SELL =
  /(?:팔고\s*싶|팔래|팔아요?|내놓|양도|판매할|팔\s*생각|팔려고|팝니다)/iu;
const EXPLICIT_BUY = /(?:사고\s*싶|구해요?|구합니다|삽니다|구입하고)/iu;
const SOFT_SELL_THINK = /(?:팔까|팔\s*까|생각\s*중|고민|받을\s*수\s*있)/iu;
const DEVICE_SIGNAL =
  /(?:핸드폰|아이폰|iphone|갤럭시|galaxy|맥북|macbook|아이패드|ipad|노트북|폰|에어팟|airpods)/iu;
const WEAR_SIGNAL = /(?:오래|오래됐|오래돼|떨어|느려|바꾸|교체|낡|헌)/iu;
const PRICE_SIGNAL = /(\d{1,3}(?:,\d{3})+|\d+)\s*(?:만\s*)?원/u;

function readResourceType(text: string): ComposeSchemaId {
  return detectComposeSchemaFromText(text) ?? "sell_item";
}

function isExplicitMarketIntent(text: string): boolean {
  if (EXPLICIT_SELL.test(text) || EXPLICIT_BUY.test(text)) {
    return true;
  }
  if (PRICE_SIGNAL.test(text) && DEVICE_SIGNAL.test(text)) {
    return true;
  }
  if (/물건\s*팔/u.test(text) || /물건\s*구/u.test(text)) {
    return true;
  }
  return false;
}

function isSoftMarketSignal(text: string): boolean {
  if (SOFT_SELL_THINK.test(text)) {
    return true;
  }
  if (DEVICE_SIGNAL.test(text) && WEAR_SIGNAL.test(text)) {
    return true;
  }
  if (DEVICE_SIGNAL.test(text) && /(?:시세|얼마|값|가격)/u.test(text)) {
    return true;
  }
  return false;
}

function isAffirmationAfterSoft(text: string, previous: IntentState | null): boolean {
  if (!previous || previous.stage !== "soft_signal") {
    return false;
  }
  return AFFIRM_SIGNAL.test(text.trim());
}

function classifyComposeIntentRules(input: {
  newMessage: string;
  previousStage: IntentState | null;
  contextText: string;
}): IntentState {
  const text = input.newMessage.trim();
  const context = input.contextText.trim() || text;
  const resourceType = readResourceType(context);

  if (input.previousStage?.stage === "confirmed") {
    return input.previousStage;
  }

  if (isAffirmationAfterSoft(text, input.previousStage) && input.previousStage) {
    const resourceType =
      input.previousStage.stage === "soft_signal"
        ? input.previousStage.possibleIntent
        : "sell_item";
    return {
      stage: "confirmed",
      resourceType,
    };
  }

  if (isExplicitMarketIntent(text) || isExplicitMarketIntent(context)) {
    return { stage: "confirmed", resourceType };
  }

  if (isSoftMarketSignal(text) || isSoftMarketSignal(context)) {
    return { stage: "soft_signal", possibleIntent: resourceType };
  }

  if (DEVICE_SIGNAL.test(text) || DEVICE_SIGNAL.test(context)) {
    return { stage: "soft_signal", possibleIntent: resourceType };
  }

  if (input.previousStage?.stage === "soft_signal") {
    if (hasListingSubstanceForConfirm(context)) {
      return {
        stage: "confirmed",
        resourceType: input.previousStage.possibleIntent,
      };
    }
    return input.previousStage;
  }

  return { stage: "chatting" };
}

async function classifyComposeIntentLlm(input: {
  history: ComposeIntentMessage[];
  newMessage: string;
  previousStage: IntentState | null;
}): Promise<IntentState | null> {
  const raw = await callLlmTextJson({
    systemPrompt: [
      "Classify Korean chat intent for a marketplace assistant.",
      'Return JSON: { "stage": "chatting"|"soft_signal"|"confirmed", "possibleIntent"?: "sell_item", "resourceType"?: "sell_item" }.',
      "chatting: casual talk, no trade intent.",
      "soft_signal: maybe sell/buy but not committed — ask before draft.",
      "confirmed: user wants to list/buy now or clearly agreed to register.",
      `Previous stage: ${JSON.stringify(input.previousStage)}`,
    ].join(" "),
    userText: [
      ...input.history.map((m) => `${m.role}: ${m.text}`),
      `user: ${input.newMessage}`,
    ].join("\n"),
    temperature: 0.1,
  });
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as {
      stage?: string;
      possibleIntent?: ComposeSchemaId;
      resourceType?: ComposeSchemaId;
    };
    if (parsed.stage === "confirmed") {
      return {
        stage: "confirmed",
        resourceType: parsed.resourceType ?? "sell_item",
      };
    }
    if (parsed.stage === "soft_signal") {
      return {
        stage: "soft_signal",
        possibleIntent: parsed.possibleIntent ?? "sell_item",
      };
    }
    if (parsed.stage === "chatting") {
      return { stage: "chatting" };
    }
  } catch {
    return null;
  }
  return null;
}

export async function classifyComposeIntent(input: {
  history: ComposeIntentMessage[];
  newMessage: string;
  previousStage?: IntentState | null;
}): Promise<IntentState> {
  const previousStage = input.previousStage ?? null;
  const contextText = buildComposeContextText({
    history: input.history,
    newMessage: input.newMessage,
  });
  const rule = classifyComposeIntentRules({
    newMessage: input.newMessage,
    previousStage,
    contextText,
  });
  const llm = await classifyComposeIntentLlm({
    history: input.history,
    newMessage: input.newMessage,
    previousStage,
  });

  if (!llm) {
    return rule;
  }

  if (rule.stage === "confirmed") {
    return rule;
  }
  if (llm.stage === "confirmed" && rule.stage !== "chatting") {
    return llm;
  }
  if (llm.stage === "soft_signal" && rule.stage === "chatting") {
    return llm;
  }
  return rule;
}

export function detectAmbientMarketInterest(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.startsWith("@")) {
    return false;
  }
  return isSoftMarketSignal(trimmed) || (DEVICE_SIGNAL.test(trimmed) && WEAR_SIGNAL.test(trimmed));
}
