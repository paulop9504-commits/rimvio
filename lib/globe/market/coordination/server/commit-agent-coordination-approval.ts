import type { SupabaseClient } from "@supabase/supabase-js";
import type { MarketHandshakeRecord } from "@/lib/globe/market/market-handshake-types";
import type { AgentNegotiationProposal } from "@/lib/globe/market/coordination/agent-negotiation-types";
import { buildNegotiationTraceContext } from "@/lib/globe/market/build-negotiation-trace-context";
import { isExplicitMarketTradePipeline } from "@/lib/globe/market/market-trade-pipeline";
import { readMarketAvailabilityPreset } from "@/lib/globe/market/market-availability-preset";
import { buildHandshakeMeetTimePatchFromProposal } from "@/lib/globe/market/parse-proposal-meet-time-ko";
import {
  findMarketHandshakeById,
  patchMarketHandshake,
} from "@/lib/globe/market/server/market-alignment-handshake-store";
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

  let currentHandshake = handshake;
  if (!alreadyScheduling && handshake.tradeStatus === "chat") {
    await tryInitializeMarketTradeSession(supabase, handshake.id, listing);
    const refreshed = await findMarketHandshakeById(supabase, handshake.id);
    if (refreshed) {
      currentHandshake = refreshed;
    }
  }

  const negotiation = buildNegotiationTraceContext({
    productName: listing.detail.productName || listing.title,
    priceLine: proposal?.priceKo?.trim() || "",
    viewerRole: "listing",
    realizedPriceKrw: currentHandshake.realizedPriceKrw,
    proposal,
    filledSlots: {},
    log: [],
  });

  const handshakePatch: Parameters<typeof patchMarketHandshake>[2] = {};
  if (proposal?.meetPlaceKo?.trim() && !currentHandshake.meetPlaceLabel?.trim()) {
    handshakePatch.meetPlaceLabel = proposal.meetPlaceKo.trim();
  }
  if (
    negotiation.realizedPriceKrw !== null &&
    currentHandshake.realizedPriceKrw === null
  ) {
    handshakePatch.realizedPriceKrw = negotiation.realizedPriceKrw;
  }

  const preset = readMarketAvailabilityPreset(listing.detail?.availabilityPreset);
  Object.assign(
    handshakePatch,
    buildHandshakeMeetTimePatchFromProposal({
      handshake: currentHandshake,
      meetTimeKo: proposal?.meetTimeKo,
      availabilityPreset: preset,
    }),
  );

  if (Object.keys(handshakePatch).length > 0) {
    await patchMarketHandshake(supabase, handshake.id, handshakePatch);
  }
}
