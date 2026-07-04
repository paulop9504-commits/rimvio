import { createPersonalGlobePinFromEvent } from "@/lib/globe/create-personal-globe-pin";
import { MARKET_COMPLETION_META_KEY } from "@/lib/globe/market/market-completion-pinned-store";
import { markMarketCompletionTracePinned } from "@/lib/globe/market/market-completion-pinned-store";
import type { MarketCompletionTraceDraft } from "@/lib/globe/market/market-handshake-types";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

/** Dual-confirm complete → private globe trace (1-tap). */
export function commitMarketCompletionTrace(input: {
  trace: MarketCompletionTraceDraft;
  threadId?: string | null;
}) {
  const nowIso = new Date().toISOString();
  const event = commitEventUpsert({
    id: input.trace.eventId,
    title: input.trace.title,
    category: "custom",
    source: "system",
    lifecycle: "completed",
    datetime: input.trace.atIso?.trim() || nowIso,
    place: input.trace.placeLabel,
    confidence: 0.92,
    metadata: {
      [MARKET_COMPLETION_META_KEY]: {
        handshakeId: input.trace.handshakeId,
        seekingUserId: input.trace.seekingUserId,
        listingUserId: input.trace.listingUserId,
        role: input.trace.role,
        priceLine: input.trace.priceLine,
        productName: input.trace.productName,
        realizedPriceKrw: input.trace.realizedPriceKrw ?? null,
        negotiationSummaryKo: input.trace.negotiationSummaryKo,
        coordinationLogSummary: input.trace.coordinationLogSummary,
        proposal: input.trace.proposal ?? null,
        filledSlots: input.trace.filledSlots ?? {},
      },
      globePlaceConfirmed: true,
      globePlaceLat: input.trace.lat,
      globePlaceLng: input.trace.lng,
      globePlaceLabel: input.trace.placeLabel,
    },
  });

  createPersonalGlobePinFromEvent({
    event,
    experienceTitle: input.trace.title,
    shareWithPeerThreadIds: input.threadId?.trim() ? [input.threadId.trim()] : [],
  });

  markMarketCompletionTracePinned(input.trace.handshakeId);
  return event;
}
