import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import { isMarketIntentPublishedExternal } from "@/lib/globe/market/market-intent-detail";

/** Matching + discovery pool — published portal projections only. */
export function filterPublishedMarketIntents(
  rows: readonly MarketIntentRecord[],
): MarketIntentRecord[] {
  return rows.filter((row) => row.active && isMarketIntentPublishedExternal(row.detail));
}
