import { detectLodgingSearchIntent } from "@/lib/globe/lodging/detect-lodging-search-intent";
import {
  detectNaturalMarketComposeInput,
  isBareMarketComposeInput,
  isMentionMarketComposeInput,
} from "@/lib/globe/market/detect-market-compose-input";
import { parseActionMention } from "@/lib/event-kernel/action-contracts/parse-action-mention";
import type { GlobeMapIntent } from "@/lib/globe/intent-supply/globe-map-intent-types";

const FOOD_ENTITY = /(?:맛집|식당|레스토랑|음식점|카페|브런치|food|dining|cafe)/iu;
const FOOD_NEED = /(?:찾|추천|알려|골라|어디|갈|need|search)/iu;

const RECALL_SIGNAL =
  /(?:다녀|갔|기억|추억|여행|recall|remember|where\s+did)/iu;
const RECALL_PERSON_HINT = /(?:랑|와|과|이랑|하고|친구|동료|who)/iu;

const CONTEXT_CONNECT_SIGNAL =
  /(?:맥락\s*(?:연결|저장|남기)|지도에\s*(?:연결|표시|남기)|(?:흔적|기록)\s*(?:남기|저장)|connect\s+context)/iu;

/** Deterministic NL intent for globe map prompt — no LLM. */
export function resolveGlobeMapIntent(message: string): GlobeMapIntent {
  const text = message.trim();
  if (!text) {
    return { kind: "unknown", supplyTarget: null };
  }

  if (isMentionMarketComposeInput(text) || isBareMarketComposeInput(text)) {
    return { kind: "market_compose", supplyTarget: "market" };
  }

  const mention = parseActionMention(text);
  if (mention?.feature.action) {
    return { kind: "navigation_action", supplyTarget: "navigation" };
  }

  if (detectLodgingSearchIntent(text)) {
    return { kind: "lodging_supply", supplyTarget: "lodging" };
  }

  if (FOOD_ENTITY.test(text) && FOOD_NEED.test(text)) {
    return { kind: "place_food_supply", supplyTarget: "eatery" };
  }

  if (detectNaturalMarketComposeInput(text)) {
    return { kind: "market_compose", supplyTarget: "market" };
  }

  if (RECALL_SIGNAL.test(text) && RECALL_PERSON_HINT.test(text)) {
    return { kind: "people_recall", supplyTarget: "memory" };
  }

  if (RECALL_SIGNAL.test(text)) {
    return { kind: "people_recall", supplyTarget: "memory" };
  }

  if (CONTEXT_CONNECT_SIGNAL.test(text)) {
    return { kind: "context_connect", supplyTarget: "context" };
  }

  return { kind: "unknown", supplyTarget: null };
}
