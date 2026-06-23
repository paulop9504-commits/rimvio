import type { MarketMemoryRecord } from "@/lib/globe/market/market-intent-detail";
import { readMarketMemoryRecord } from "@/lib/globe/market/market-intent-detail";
import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";

export function formatMarketMemoryPreview(
  detail: { memoryRecord?: MarketMemoryRecord | null },
  role: MarketIntentRole,
): string | null {
  const memory = readMarketMemoryRecord(detail);
  if (role === "seeking") {
    const line = memory.seekingContext.trim() || memory.story.trim() || memory.why.trim();
    return line ? line.slice(0, 120) : null;
  }
  const line =
    memory.story.trim() ||
    memory.categoryAnswer.trim() ||
    memory.care.trim();
  return line ? line.slice(0, 120) : null;
}

export function hasMarketMemoryContent(
  detail: { memoryRecord?: MarketMemoryRecord | null },
): boolean {
  const memory = readMarketMemoryRecord(detail);
  return Boolean(
    memory.story.trim() ||
      memory.care.trim() ||
      memory.why.trim() ||
      memory.categoryAnswer.trim() ||
      memory.seekingContext.trim() ||
      memory.seekingWhy.trim() ||
      memory.experienceTags.length > 0,
  );
}
