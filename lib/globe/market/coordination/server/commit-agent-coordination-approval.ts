import type { SupabaseClient } from "@supabase/supabase-js";
import type { MarketHandshakeRecord } from "@/lib/globe/market/market-handshake-types";
import type { AgentNegotiationProposal } from "@/lib/globe/market/coordination/agent-negotiation-types";
import { buildNegotiationTraceContext } from "@/lib/globe/market/build-negotiation-trace-context";
import { isExplicitMarketTradePipeline } from "@/lib/globe/market/market-trade-pipeline";
import { findMarketIntentById } from "@/lib/globe/market/server/upsert-market-intent";
import { tryInitializeMarketTradeSession } from "@/lib/globe/market/server/initialize-market-trade-session";

/** Approval gate — moves handshake into scheduling FSM when still chat-only. */
export async function commitAgentCoordinationApprovalToHandshake(
  supabase: SupabaseClient,
  handshake: MarketHandshakeRecord,
  proposal: AgentNegotiationProposal | null,
): Promise<void> {
  const listing = await findMarketIntentById(supabase, handshake.listingIntentId);
  if (!listing) {
    return;
  }

  const alreadyScheduling = isExplicitMarketTradePipeline({
    tradeStatus: handshake.tradeStatus,
    schedulingExpiresAtIso: handshake.schedulingExpiresAtIso,
  });

  if (!alreadyScheduling && handshake.tradeStatus === "chat") {
    await tryInitializeMarketTradeSession(supabase, handshake.id, listing);
  }

  const { patchMarketHandshake } = await import(
    "@/lib/globe/market/server/market-alignment-handshake-store"
  );

  const negotiation = buildNegotiationTraceContext({
    productName: listing.detail.productName || listing.title,
    priceLine: proposal?.priceKo?.trim() || "",
    viewerRole: "listing",
    realizedPriceKrw: handshake.realizedPriceKrw,
    proposal,
    filledSlots: {},
    log: [],
  });

  const handshakePatch: Parameters<typeof patchMarketHandshake>[2] = {};
  if (proposal?.meetPlaceKo?.trim() && !handshake.meetPlaceLabel?.trim()) {
    handshakePatch.meetPlaceLabel = proposal.meetPlaceKo.trim();
  }
  if (
    negotiation.realizedPriceKrw !== null &&
    handshake.realizedPriceKrw === null
  ) {
    handshakePatch.realizedPriceKrw = negotiation.realizedPriceKrw;
  }
  if (Object.keys(handshakePatch).length > 0) {
    await patchMarketHandshake(supabase, handshake.id, handshakePatch);
  }
}
