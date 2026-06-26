/** Buyer may tap 「약속장소로 출발」 from 3h before meet until 2h after. */
export const MARKET_TRADE_DEPART_WINDOW_BEFORE_MS = 3 * 60 * 60 * 1000;
export const MARKET_TRADE_DEPART_WINDOW_AFTER_MS = 2 * 60 * 60 * 1000;

export function isMarketTradeDepartWindowOpen(
  meetAtIso: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!meetAtIso?.trim()) {
    return false;
  }
  const meetAt = new Date(meetAtIso).getTime();
  if (!Number.isFinite(meetAt)) {
    return false;
  }
  const nowMs = now.getTime();
  return (
    nowMs >= meetAt - MARKET_TRADE_DEPART_WINDOW_BEFORE_MS &&
    nowMs <= meetAt + MARKET_TRADE_DEPART_WINDOW_AFTER_MS
  );
}
