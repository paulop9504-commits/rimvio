import {
  isMarketListingReservedForOthers,
  isMarketTradePipelineActive,
} from "@/lib/globe/market/market-trade-pipeline";
import type { MarketHandshakeIntentPair } from "@/lib/globe/market/market-trade-types";
import type { MarketTradeSessionView } from "@/lib/globe/market/market-trade-types";
import type { OpportunityRow } from "@/lib/globe/opportunity-field";

/**
 * Discovery rows: hide listings reserved for another buyer, or in an active
 * schedule pipeline for the current seeker. Chat-only matches stay visible.
 */
export function filterOpportunityRowsExcludingActiveTrades(
  rows: readonly OpportunityRow[],
  sessions: readonly MarketTradeSessionView[],
  selectedSeekingIntentId?: string | null,
  resolvedPairs: readonly MarketHandshakeIntentPair[] = [],
): OpportunityRow[] {
  const blockedListingIds = new Set<string>();

  for (const session of sessions) {
    if (isMarketListingReservedForOthers(session.tradeStatus)) {
      blockedListingIds.add(session.listingIntentId);
      continue;
    }

    const isCurrentSeeker =
      !selectedSeekingIntentId ||
      session.seekingIntentId === selectedSeekingIntentId;
    if (isCurrentSeeker && isMarketTradePipelineActive(session.tradeStatus)) {
      blockedListingIds.add(session.listingIntentId);
    }
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
