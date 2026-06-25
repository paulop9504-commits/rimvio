import type { MarketTradeSessionView } from "@/lib/globe/market/market-trade-types";
import type { OpportunityRow } from "@/lib/globe/opportunity-field";

/** Discovery rows must not repeat listings already in an active trade session. */
export function filterOpportunityRowsExcludingActiveTrades(
  rows: readonly OpportunityRow[],
  sessions: readonly MarketTradeSessionView[],
  selectedSeekingIntentId?: string | null,
): OpportunityRow[] {
  if (sessions.length === 0) {
    return [...rows];
  }

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

  if (blockedListingIds.size === 0) {
    return [...rows];
  }

  return rows.filter((row) => !blockedListingIds.has(row.listingId));
}
