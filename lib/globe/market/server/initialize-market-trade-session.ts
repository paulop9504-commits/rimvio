import type { SupabaseClient } from "@supabase/supabase-js";
import {
  generateMarketTradeScheduleCandidates,
  MARKET_SCHEDULING_SLA_HOURS,
  readMarketAvailabilityPreset,
} from "@/lib/globe/market/market-availability-preset";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import { patchMarketHandshake } from "@/lib/globe/market/server/market-alignment-handshake-store";

export async function initializeMarketTradeSession(
  supabase: SupabaseClient,
  handshakeId: string,
  listing: Pick<
    MarketIntentRecord,
    "placeLabel" | "anchorLat" | "anchorLng" | "detail"
  >,
): Promise<void> {
  const preset = readMarketAvailabilityPreset(listing.detail?.availabilityPreset);
  const candidates = generateMarketTradeScheduleCandidates(preset);
  const placeLabel = listing.placeLabel?.trim() || null;
  const expiresAt = new Date(
    Date.now() + MARKET_SCHEDULING_SLA_HOURS * 60 * 60 * 1000,
  ).toISOString();

  await patchMarketHandshake(supabase, handshakeId, {
    tradeStatus: "scheduling",
    meetMode: "host",
    scheduleCandidates: candidates,
    meetPlaceLabel: placeLabel,
    meetLat: listing.anchorLat ?? null,
    meetLng: listing.anchorLng ?? null,
    preferredMeetAtIso: null,
    schedulingExpiresAtIso: expiresAt,
  });
}

/** Best-effort — chat must not fail when trade SQL migrations are pending. */
export async function tryInitializeMarketTradeSession(
  supabase: SupabaseClient,
  handshakeId: string,
  listing: Pick<
    MarketIntentRecord,
    "placeLabel" | "anchorLat" | "anchorLng" | "detail"
  >,
): Promise<boolean> {
  try {
    await initializeMarketTradeSession(supabase, handshakeId, listing);
    return true;
  } catch (error) {
    console.error(
      "[market-trade] init skipped:",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}
