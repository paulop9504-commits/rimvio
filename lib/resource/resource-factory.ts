import { readGlobeChatMessages } from "@/lib/globe/chat/globe-chat-session-store";
import { readPortalComposeRunState } from "@/lib/portal/portal-compose-run-store";
import { sellItemDraftToComposeText } from "@/lib/portal/compose-draft/draft-to-market-intent";
import { buildMarketIntentFromComposeDraft } from "@/lib/portal/compose-draft/draft-to-market-intent";
import type { MarketIntentDraft } from "@/lib/globe/market/market-intent-types";

export type ResourceType =
  | "sell_item"
  | "job_post"
  | "real_estate"
  | "study_group"
  | "project";

export type ChatSessionId = string & { readonly __rimvioChatSessionId: unique symbol };

export function asChatSessionId(graphId: string): ChatSessionId {
  return graphId as ChatSessionId;
}

export type ConversationResourceDraft = {
  resourceType: ResourceType;
  graphId: string;
  composeText: string;
  eventId: string;
  marketDraft: MarketIntentDraft | null;
  messageCount: number;
};

/**
 * Single factory for resources born from chat — callers must pass chatSessionId.
 * Direct Resource construction outside this module is a review violation.
 */
export async function createResourceFromConversation(
  chatSessionId: ChatSessionId,
  resourceType: ResourceType,
): Promise<ConversationResourceDraft> {
  const graphId = chatSessionId as string;
  const state = readPortalComposeRunState(graphId);
  if (!state) {
    throw new Error("chat_session_not_found");
  }

  const composeText =
    sellItemDraftToComposeText(state.composeDraft ?? {}) || state.accumulatedText;
  const marketDraft =
    resourceType === "sell_item"
      ? buildMarketIntentFromComposeDraft({
          eventId: state.eventId,
          intentId: state.intentId,
          composeText,
          liveLat: null,
          liveLng: null,
          draft: state.composeDraft ?? {},
          existing: state.marketDraft,
        })
      : null;

  return {
    resourceType,
    graphId,
    composeText,
    eventId: state.eventId,
    marketDraft,
    messageCount: readGlobeChatMessages(graphId).length,
  };
}
