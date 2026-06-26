import type { MarketTradeStatus } from "@/lib/globe/market/market-trade-types";

/** Seller cannot hold two reservations within this window. */
export const MARKET_TRADE_MEET_CONFLICT_WINDOW_MS = 90 * 60 * 1000;

export const SELLER_MEET_CONFLICT_TRADE_STATUSES: readonly MarketTradeStatus[] = [
  "seller_proposed",
  "confirmed",
  "en_route",
  "meeting",
];

export function marketTradeMeetTimesConflict(
  meetAtIsoA: string,
  meetAtIsoB: string,
  windowMs = MARKET_TRADE_MEET_CONFLICT_WINDOW_MS,
): boolean {
  const a = Date.parse(meetAtIsoA);
  const b = Date.parse(meetAtIsoB);
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return false;
  }
  return Math.abs(a - b) < windowMs;
}
