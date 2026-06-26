import type { SupabaseClient } from "@supabase/supabase-js";
import {
  marketTradeMeetTimesConflict,
  SELLER_MEET_CONFLICT_TRADE_STATUSES,
} from "@/lib/globe/market/market-trade-meet-conflict";

export async function findListingUserMeetTimeConflict(
  supabase: SupabaseClient,
  input: {
    listingUserId: string;
    meetAtIso: string;
    excludeHandshakeId: string;
  },
): Promise<{ handshakeId: string; meetAtIso: string } | null> {
  const { data, error } = await supabase
    .from("market_alignment_handshakes")
    .select("id, meet_at, trade_status")
    .eq("listing_user_id", input.listingUserId.trim())
    .in("trade_status", [...SELLER_MEET_CONFLICT_TRADE_STATUSES])
    .neq("id", input.excludeHandshakeId.trim())
    .not("meet_at", "is", null)
    .limit(24);

  if (error) {
    throw error;
  }

  for (const row of data ?? []) {
    const handshakeId = typeof row.id === "string" ? row.id : "";
    const meetAtIso = typeof row.meet_at === "string" ? row.meet_at : "";
    if (
      handshakeId &&
      meetAtIso &&
      marketTradeMeetTimesConflict(meetAtIso, input.meetAtIso)
    ) {
      return { handshakeId, meetAtIso };
    }
  }
  return null;
}
