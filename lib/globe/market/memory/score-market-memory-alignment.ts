import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import { readMarketMemoryRecord } from "@/lib/globe/market/market-intent-detail";

export function scoreMarketExperienceTagAlignment(
  a: MarketIntentRecord,
  b: MarketIntentRecord,
): number {
  const tagsA = readMarketMemoryRecord(a.detail).experienceTags;
  const tagsB = readMarketMemoryRecord(b.detail).experienceTags;
  if (tagsA.length === 0 || tagsB.length === 0) {
    return 0.55;
  }
  const overlap = tagsA.filter((tag) => tagsB.includes(tag));
  if (overlap.length === 0) {
    return 0.38;
  }
  return Math.min(1, 0.62 + overlap.length * 0.18);
}

export function marketMemoryOverlapLabels(
  a: MarketIntentRecord,
  b: MarketIntentRecord,
): string[] {
  const tagsA = readMarketMemoryRecord(a.detail).experienceTags;
  const tagsB = readMarketMemoryRecord(b.detail).experienceTags;
  return tagsA.filter((tag) => tagsB.includes(tag)).slice(0, 3);
}
