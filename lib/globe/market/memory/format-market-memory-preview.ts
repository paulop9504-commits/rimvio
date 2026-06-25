import type { MarketIntentDetail, MarketMemoryRecord } from "@/lib/globe/market/market-intent-detail";
import { readMarketMemoryRecord } from "@/lib/globe/market/market-intent-detail";
import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";

export function formatMarketMemoryPreview(
  detail: Pick<MarketIntentDetail, "memoryRecord" | "detailNote">,
  role: MarketIntentRole,
): string | null {
  const memory = readMarketMemoryRecord(detail);
  if (role === "seeking") {
    const line = memory.seekingContext.trim();
    return line ? line.slice(0, 120) : null;
  }
  const line =
    memory.categoryAnswer.trim() ||
    memory.care.trim() ||
    detail.detailNote?.trim();
  return line ? line.slice(0, 120) : null;
}

export function hasMarketMemoryContent(
  detail: { memoryRecord?: MarketMemoryRecord | null; detailNote?: string },
): boolean {
  const memory = readMarketMemoryRecord(detail);
  return Boolean(
    memory.care.trim() ||
      memory.categoryAnswer.trim() ||
      memory.seekingContext.trim() ||
      memory.experienceTags.length > 0 ||
      detail.detailNote?.trim(),
  );
}
