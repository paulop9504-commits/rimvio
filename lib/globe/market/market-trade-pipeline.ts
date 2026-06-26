import type {
  MarketHandshakeIntentPair,
  MarketTradeSessionView,
  MarketTradeStatus,
} from "@/lib/globe/market/market-trade-types";

/** Match accepted — chat only, no scheduling pipeline yet. */
export const MARKET_TRADE_CHAT_STATUS: MarketTradeStatus = "chat";

/** Trade statuses where buyer/seller are actively scheduling or meeting. */
export const MARKET_TRADE_PIPELINE_STATUSES: readonly MarketTradeStatus[] = [
  "scheduling",
  "buyer_picked_day",
  "seller_proposed",
  "confirmed",
  "en_route",
  "meeting",
] as const;

/** Listing is reserved for one buyer — hide from other seekers' discovery. */
export const MARKET_LISTING_RESERVED_STATUSES: readonly MarketTradeStatus[] = [
  "confirmed",
  "en_route",
  "meeting",
] as const;

export function normalizeMarketTradeStatus(
  raw: string | null | undefined,
): MarketTradeStatus {
  if (raw === "chat") return "chat";
  if (
    raw &&
    (
      MARKET_TRADE_PIPELINE_STATUSES as readonly string[]
    ).includes(raw)
  ) {
    return raw as MarketTradeStatus;
  }
  if (raw === "completed" || raw === "expired" || raw === "cancelled") {
    return raw;
  }
  return MARKET_TRADE_CHAT_STATUS;
}

export function isMarketTradePipelineActive(
  status: MarketTradeStatus | string | null | undefined,
): boolean {
  const normalized = normalizeMarketTradeStatus(
    typeof status === "string" ? status : status ?? null,
  );
  return (MARKET_TRADE_PIPELINE_STATUSES as readonly string[]).includes(
    normalized,
  );
}

export function isMarketListingReservedForOthers(
  status: MarketTradeStatus | string | null | undefined,
): boolean {
  const normalized = normalizeMarketTradeStatus(
    typeof status === "string" ? status : status ?? null,
  );
  return (MARKET_LISTING_RESERVED_STATUSES as readonly string[]).includes(
    normalized,
  );
}

export function hasActiveMarketTradeForListing(
  sessions: readonly MarketTradeSessionView[],
  listingIntentId: string,
  seekingIntentId?: string | null,
  resolvedPairs: readonly MarketHandshakeIntentPair[] = [],
): boolean {
  const inPipeline = sessions.some(
    (session) =>
      session.listingIntentId === listingIntentId &&
      (!seekingIntentId || session.seekingIntentId === seekingIntentId) &&
      isMarketTradePipelineActive(session.tradeStatus),
  );
  if (inPipeline) {
    return true;
  }
  if (!seekingIntentId) {
    return false;
  }
  return resolvedPairs.some(
    (pair) =>
      pair.listingIntentId === listingIntentId &&
      pair.seekingIntentId === seekingIntentId,
  );
}
