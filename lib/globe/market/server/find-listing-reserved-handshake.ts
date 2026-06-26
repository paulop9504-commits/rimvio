import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isMarketListingReservedForOthers,
  normalizeMarketTradeStatus,
} from "@/lib/globe/market/market-trade-pipeline";
import type { MarketHandshakeDbRow } from "@/lib/globe/market/server/market-alignment-handshake-store";

export async function listReservedListingIntentIds(
  supabase: SupabaseClient,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("market_alignment_handshakes")
    .select("listing_intent_id, trade_status, phase")
    .in("phase", ["pending_buyer_start", "active"])
    .not("listing_intent_id", "is", null);

  if (error || !data) {
    return new Set();
  }

  const reserved = new Set<string>();
  for (const row of data) {
    const status = normalizeMarketTradeStatus(row.trade_status);
    if (isMarketListingReservedForOthers(status)) {
      const listingId = row.listing_intent_id?.trim();
      if (listingId) reserved.add(listingId);
    }
  }
  return reserved;
}

/** Another seeker already has a confirmed meet on this listing. */
export async function findListingReservedHandshake(
  supabase: SupabaseClient,
  input: {
    listingIntentId: string;
    excludeSeekingUserId?: string | null;
  },
): Promise<MarketHandshakeDbRow | null> {
  const listingIntentId = input.listingIntentId.trim();
  if (!listingIntentId) return null;

  const { data, error } = await supabase
    .from("market_alignment_handshakes")
    .select("*")
    .eq("listing_intent_id", listingIntentId)
    .in("phase", ["pending_buyer_start", "active"])
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error || !data?.length) return null;

  const excludeUserId = input.excludeSeekingUserId?.trim() ?? "";
  for (const row of data) {
    if (excludeUserId && row.seeking_user_id === excludeUserId) continue;
    const status = normalizeMarketTradeStatus(row.trade_status);
    if (isMarketListingReservedForOthers(status)) {
      return row as MarketHandshakeDbRow;
    }
  }
  return null;
}
