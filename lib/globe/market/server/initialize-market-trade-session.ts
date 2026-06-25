import type { SupabaseClient } from "@supabase/supabase-js";
import { generateMarketTradeScheduleCandidates } from "@/lib/globe/market/generate-market-trade-schedule-candidates";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import { patchMarketHandshake } from "@/lib/globe/market/server/market-alignment-handshake-store";

export async function initializeMarketTradeSession(
  supabase: SupabaseClient,
  handshakeId: string,
  listing: Pick<
    MarketIntentRecord,
    "placeLabel" | "anchorLat" | "anchorLng"
  >,
): Promise<void> {
  const candidates = generateMarketTradeScheduleCandidates();
  const placeLabel = listing.placeLabel?.trim() || null;
  await patchMarketHandshake(supabase, handshakeId, {
    tradeStatus: "scheduling",
    meetMode: "host",
    scheduleCandidates: candidates,
    meetPlaceLabel: placeLabel,
    meetLat: listing.anchorLat ?? null,
    meetLng: listing.anchorLng ?? null,
  });
}
