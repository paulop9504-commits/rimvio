import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveMarketAlignment } from "@/lib/globe/market/resolve-market-alignment";
import { scoreWeightedMarketAlignment } from "@/lib/globe/market/score-weighted-market-alignment";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import {
  listActiveMarketIntentsForMatching,
  listOwnMarketIntents,
} from "@/lib/globe/market/server/upsert-market-intent";
import { upsertMarketHandshake } from "@/lib/globe/market/server/market-alignment-handshake-store";

const SCAN_COPY = {
  headlineSeeking: (t: string, p: string) => `${t} ${p}`,
  headlineListing: (t: string, p: string) => `${t} ${p}`,
  body: (c: string, d: number, price: string) => `${c} ${d} ${price}`,
  cta: "",
};

/** After intent upsert — create seller-first handshake rows for threshold matches. */
export async function scanMarketHandshakesForIntent(
  supabase: SupabaseClient,
  saved: MarketIntentRecord & { userId?: string | null },
): Promise<void> {
  const userId = saved.userId?.trim();
  if (!userId) {
    return;
  }

  const own = await listOwnMarketIntents(supabase, userId);
  const others = await listActiveMarketIntentsForMatching(supabase, {
    excludeUserId: userId,
    limit: 150,
  });
  if (others.length === 0) {
    return;
  }

  const pool = [...own, ...others];
  const offer = resolveMarketAlignment({
    intents: pool,
    focusEventId: saved.eventId,
    copy: SCAN_COPY,
  });
  if (!offer) {
    return;
  }

  const self = pool.find((row) => row.id === offer.selfIntentId) ?? saved;
  const other = pool.find((row) => row.id === offer.matchIntentId);
  if (!other?.userId) {
    return;
  }

  const seeking = self.role === "seeking" ? self : other;
  const listing = self.role === "listing" ? self : other;
  if (!seeking.userId || !listing.userId) {
    return;
  }

  const weighted = scoreWeightedMarketAlignment(seeking, listing);
  if (!weighted.passes) {
    return;
  }

  await upsertMarketHandshake(supabase, {
    seekingIntentId: seeking.id,
    listingIntentId: listing.id,
    seekingUserId: seeking.userId,
    listingUserId: listing.userId,
    alignmentScore: weighted.total,
    priorityHint: offer.priorityHintKo ?? weighted.topMatchedLabelsKo.join(" · "),
  });
}
