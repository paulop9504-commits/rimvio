import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";

const OPEN_MAX = Number.MAX_SAFE_INTEGER;

export type MarketPriceBounds = {
  minKrw: number;
  maxKrw: number;
};

/** Seeking — single price field = budget ceiling (상한). */
export function readSeekingBudgetBounds(record: MarketIntentRecord): MarketPriceBounds {
  const slotPrice = record.detail.prioritySlots?.price;
  const min = record.priceMinKrw;
  const max = record.priceMaxKrw;
  if (min !== null && max !== null && min === max) {
    return { minKrw: 0, maxKrw: max };
  }
  if (max !== null && min === null) {
    return { minKrw: 0, maxKrw: max };
  }
  if (min !== null && max === null) {
    return { minKrw: min, maxKrw: OPEN_MAX };
  }
  if (typeof slotPrice === "number" && slotPrice > 0) {
    return { minKrw: 0, maxKrw: slotPrice };
  }
  return { minKrw: min ?? 0, maxKrw: max ?? OPEN_MAX };
}

/** Listing — single price field = ask (희망 판매가). */
export function readListingAskBounds(record: MarketIntentRecord): MarketPriceBounds {
  const slotPrice = record.detail.prioritySlots?.price;
  const min = record.priceMinKrw;
  const max = record.priceMaxKrw;
  if (min !== null && max !== null && min === max) {
    return { minKrw: min, maxKrw: min };
  }
  if (min !== null && max === null) {
    return { minKrw: min, maxKrw: OPEN_MAX };
  }
  if (min === null && max !== null) {
    return { minKrw: 0, maxKrw: max };
  }
  if (typeof slotPrice === "number" && slotPrice > 0) {
    return { minKrw: slotPrice, maxKrw: slotPrice };
  }
  return { minKrw: min ?? 0, maxKrw: max ?? OPEN_MAX };
}

function partialScoreFromGap(gapKrw: number, referenceKrw: number, negotiable: boolean): number {
  if (gapKrw <= 0) {
    return 1;
  }
  const ref = Math.max(referenceKrw, 100_000);
  const ratio = gapKrw / ref;
  const softCap = negotiable ? 0.35 : 0.125;
  const hardCap = negotiable ? 0.5 : 0.25;

  if (ratio <= softCap) {
    return 1 - (ratio / softCap) * 0.35;
  }
  if (ratio <= hardCap) {
    const t = (ratio - softCap) / (hardCap - softCap);
    return 0.65 - t * 0.45;
  }
  if (negotiable) {
    return Math.max(0.55, 0.65 - (ratio - hardCap) * 0.5);
  }
  return 0;
}

/**
 * Role-aware price fit — practical C2C cases:
 * - Buyer budget ≥ seller ask → full score
 * - Seller ask below buyer floor → partial (too cheap / mismatch)
 * - Buyer budget below seller ask → partial by gap (~10만 on 80만)
 */
export function scoreMarketPriceAlignment(
  seeking: MarketIntentRecord,
  listing: MarketIntentRecord,
): number {
  const budget = readSeekingBudgetBounds(seeking);
  const ask = readListingAskBounds(listing);
  const negotiable =
    seeking.detail.priceNegotiable === true || listing.detail.priceNegotiable === true;

  if (budget.maxKrw >= ask.minKrw) {
    if (budget.minKrw === 0 || ask.maxKrw >= budget.minKrw) {
      return 1;
    }
    const belowGap = budget.minKrw - ask.maxKrw;
    return partialScoreFromGap(belowGap, budget.minKrw, negotiable);
  }

  const affordGap = ask.minKrw - budget.maxKrw;
  return partialScoreFromGap(affordGap, ask.minKrw, negotiable);
}
