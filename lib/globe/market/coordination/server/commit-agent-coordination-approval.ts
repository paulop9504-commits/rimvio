import type { SupabaseClient } from "@supabase/supabase-js";
import type { MarketHandshakeRecord } from "@/lib/globe/market/market-handshake-types";
import type { AgentNegotiationProposal } from "@/lib/globe/market/coordination/agent-negotiation-types";
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

  if (proposal?.meetPlaceKo?.trim() && !handshake.meetPlaceLabel?.trim()) {
    const { patchMarketHandshake } = await import(
      "@/lib/globe/market/server/market-alignment-handshake-store"
    );
    await patchMarketHandshake(supabase, handshake.id, {
      meetPlaceLabel: proposal.meetPlaceKo.trim(),
    });
  }
}
