import type { MarketHandshakeIntentPair } from "@/lib/globe/market/market-trade-types";
import type { MarketTradeSessionView } from "@/lib/globe/market/market-trade-types";
import type { OpportunityRow } from "@/lib/globe/opportunity-field";

/** Discovery rows must not repeat listings in active or completed trades. */
export function filterOpportunityRowsExcludingActiveTrades(
  rows: readonly OpportunityRow[],
  sessions: readonly MarketTradeSessionView[],
  selectedSeekingIntentId?: string | null,
  resolvedPairs: readonly MarketHandshakeIntentPair[] = [],
): OpportunityRow[] {
  const blockedListingIds = new Set<string>();

  for (const session of sessions) {
    if (
      selectedSeekingIntentId &&
      session.seekingIntentId !== selectedSeekingIntentId
    ) {
      continue;
    }
    blockedListingIds.add(session.listingIntentId);
  }

  for (const pair of resolvedPairs) {
    if (
      selectedSeekingIntentId &&
      pair.seekingIntentId !== selectedSeekingIntentId
    ) {
      continue;
    }
    blockedListingIds.add(pair.listingIntentId);
  }

  if (blockedListingIds.size === 0) {
    return [...rows];
  }

  return rows.filter((row) => !blockedListingIds.has(row.listingId));
}
