import { copy } from "@/lib/copy/human-ko";
import { isMarketIntentPublishedExternal } from "@/lib/globe/market/market-intent-detail";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import { appendGlobeChatResourceCompleteMessage } from "@/lib/globe/chat/globe-chat-session-store";
import {
  readPortalComposeRunState,
  writePortalComposeRunState,
} from "@/lib/portal/portal-compose-run-store";

/** Post-publish assistant card in the chat thread. */
export function syncResourceCompleteToChat(input: {
  graphId: string;
  record: MarketIntentRecord;
}): void {
  const publishedExternal = isMarketIntentPublishedExternal(input.record.detail);
  const productName =
    input.record.detail.productName?.trim() ||
    input.record.title.trim() ||
    copy.globe.marketTradePlaceProductFallback;

  appendGlobeChatResourceCompleteMessage({
    graphId: input.graphId,
    text: copy.globe.chatCompletion.body,
    resourceId: input.record.id,
    eventId: input.record.eventId,
    productName,
    anchorLat: input.record.anchorLat,
    anchorLng: input.record.anchorLng,
    visibility: {
      innerGlobe: true,
      outerGlobe: publishedExternal,
    },
  });
}

export function markComposeDraftSubmitted(graphId: string): void {
  const state = readPortalComposeRunState(graphId);
  if (!state?.composeDraft) {
    return;
  }
  writePortalComposeRunState({
    ...state,
    composeDraft: {
      ...state.composeDraft,
      status: "submitted",
    },
    updatedAt: new Date().toISOString(),
  });
}
