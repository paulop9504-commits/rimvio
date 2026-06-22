import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MarketHandshakePhase,
  MarketHandshakeRecord,
} from "@/lib/globe/market/market-handshake-types";

export type MarketHandshakeDbRow = {
  id: string;
  seeking_intent_id: string;
  listing_intent_id: string;
  seeking_user_id: string;
  listing_user_id: string;
  thread_id: string | null;
  phase: MarketHandshakePhase;
  alignment_score: number | null;
  priority_hint: string;
  listing_accepted_at: string | null;
  buyer_started_at: string | null;
  created_at: string;
  updated_at: string;
};

export function marketHandshakeRowToRecord(row: MarketHandshakeDbRow): MarketHandshakeRecord {
  return {
    id: row.id,
    seekingIntentId: row.seeking_intent_id,
    listingIntentId: row.listing_intent_id,
    seekingUserId: row.seeking_user_id,
    listingUserId: row.listing_user_id,
    threadId: row.thread_id,
    phase: row.phase,
    alignmentScore: row.alignment_score,
    priorityHint: row.priority_hint,
    listingAcceptedAtIso: row.listing_accepted_at,
    buyerStartedAtIso: row.buyer_started_at,
    createdAtIso: row.created_at,
    updatedAtIso: row.updated_at,
  };
}

export async function findMarketHandshakeById(
  supabase: SupabaseClient,
  handshakeId: string,
): Promise<MarketHandshakeRecord | null> {
  const { data, error } = await supabase
    .from("market_alignment_handshakes")
    .select("*")
    .eq("id", handshakeId.trim())
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }
  return marketHandshakeRowToRecord(data as MarketHandshakeDbRow);
}

export async function findMarketHandshakeByThreadId(
  supabase: SupabaseClient,
  threadId: string,
): Promise<MarketHandshakeRecord | null> {
  const { data, error } = await supabase
    .from("market_alignment_handshakes")
    .select("*")
    .eq("thread_id", threadId.trim())
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }
  return marketHandshakeRowToRecord(data as MarketHandshakeDbRow);
}

export async function listPendingHandshakesForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<MarketHandshakeRecord[]> {
  const [listingRes, seekingRes] = await Promise.all([
    supabase
      .from("market_alignment_handshakes")
      .select("*")
      .eq("listing_user_id", userId)
      .eq("phase", "pending_listing")
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase
      .from("market_alignment_handshakes")
      .select("*")
      .eq("seeking_user_id", userId)
      .eq("phase", "pending_buyer_start")
      .order("updated_at", { ascending: false })
      .limit(6),
  ]);
  if (listingRes.error) {
    throw listingRes.error;
  }
  if (seekingRes.error) {
    throw seekingRes.error;
  }
  const rows = [...(listingRes.data ?? []), ...(seekingRes.data ?? [])] as MarketHandshakeDbRow[];
  return rows.map(marketHandshakeRowToRecord);
}

export async function upsertMarketHandshake(
  supabase: SupabaseClient,
  input: {
    seekingIntentId: string;
    listingIntentId: string;
    seekingUserId: string;
    listingUserId: string;
    alignmentScore: number;
    priorityHint: string;
  },
): Promise<MarketHandshakeRecord> {
  const { data: existing, error: readError } = await supabase
    .from("market_alignment_handshakes")
    .select("*")
    .eq("seeking_intent_id", input.seekingIntentId)
    .eq("listing_intent_id", input.listingIntentId)
    .maybeSingle();
  if (readError) {
    throw readError;
  }
  const now = new Date().toISOString();
  if (existing) {
    const row = existing as MarketHandshakeDbRow;
    if (row.phase !== "pending_listing") {
      return marketHandshakeRowToRecord(row);
    }
    const { data, error } = await supabase
      .from("market_alignment_handshakes")
      .update({
        alignment_score: input.alignmentScore,
        priority_hint: input.priorityHint,
        updated_at: now,
      })
      .eq("id", row.id)
      .select("*")
      .single();
    if (error) {
      throw error;
    }
    return marketHandshakeRowToRecord(data as MarketHandshakeDbRow);
  }

  const { data, error } = await supabase
    .from("market_alignment_handshakes")
    .insert({
      seeking_intent_id: input.seekingIntentId,
      listing_intent_id: input.listingIntentId,
      seeking_user_id: input.seekingUserId,
      listing_user_id: input.listingUserId,
      phase: "pending_listing",
      alignment_score: input.alignmentScore,
      priority_hint: input.priorityHint,
      updated_at: now,
    })
    .select("*")
    .single();
  if (error) {
    throw error;
  }
  return marketHandshakeRowToRecord(data as MarketHandshakeDbRow);
}

export async function updateMarketHandshakePhase(
  supabase: SupabaseClient,
  handshakeId: string,
  patch: {
    phase: MarketHandshakePhase;
    threadId?: string | null;
    listingAcceptedAtIso?: string | null;
    buyerStartedAtIso?: string | null;
  },
): Promise<MarketHandshakeRecord> {
  const { data, error } = await supabase
    .from("market_alignment_handshakes")
    .update({
      phase: patch.phase,
      thread_id: patch.threadId,
      listing_accepted_at: patch.listingAcceptedAtIso,
      buyer_started_at: patch.buyerStartedAtIso,
      updated_at: new Date().toISOString(),
    })
    .eq("id", handshakeId)
    .select("*")
    .single();
  if (error) {
    throw error;
  }
  return marketHandshakeRowToRecord(data as MarketHandshakeDbRow);
}
