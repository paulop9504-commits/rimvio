import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildNegotiationTraceContext,
  type NegotiationTraceContext,
} from "@/lib/globe/market/build-negotiation-trace-context";
import type { AgentNegotiationLogEntry } from "@/lib/globe/market/coordination/agent-negotiation-types";
import { findAgentCoordinationRoomRow } from "@/lib/globe/market/coordination/server/agent-coordination-room-server";
import type { MarketHandshakeRecord } from "@/lib/globe/market/market-handshake-types";
import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";

function readFilledSlots(value: unknown): NegotiationTraceContext["filledSlots"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const out: NegotiationTraceContext["filledSlots"] = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "string" && raw.trim()) {
      out[key as keyof NegotiationTraceContext["filledSlots"]] = raw.trim();
    }
  }
  return out;
}

/** Server read — fold coordination room into trace recall context. */
export async function readNegotiationTraceContextForHandshake(
  supabase: SupabaseClient,
  input: {
    handshake: MarketHandshakeRecord;
    productName: string;
    priceLine: string;
    viewerRole: MarketIntentRole;
  },
): Promise<NegotiationTraceContext> {
  const row = await findAgentCoordinationRoomRow(supabase, input.handshake.id);
  if (!row) {
    return buildNegotiationTraceContext({
      productName: input.productName,
      priceLine: input.priceLine,
      viewerRole: input.viewerRole,
      realizedPriceKrw: input.handshake.realizedPriceKrw,
      proposal: null,
      filledSlots: {},
      log: [],
    });
  }

  return buildNegotiationTraceContext({
    productName: input.productName,
    priceLine: input.priceLine,
    viewerRole: input.viewerRole,
    realizedPriceKrw: input.handshake.realizedPriceKrw,
    proposal: row.proposal,
    filledSlots: readFilledSlots(row.filled_slots),
    log: Array.isArray(row.log_json)
      ? (row.log_json as AgentNegotiationLogEntry[])
      : [],
  });
}
