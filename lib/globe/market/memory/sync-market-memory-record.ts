import type { MarketIntentDraft } from "@/lib/globe/market/market-intent-types";
import type { MarketMemoryRecord } from "@/lib/globe/market/market-intent-detail";
import { readMarketMemoryRecord } from "@/lib/globe/market/market-intent-detail";
import { generateMarketExperienceTags } from "@/lib/globe/market/memory/generate-market-experience-tags";
import { resolveMarketMemoryTemplate } from "@/lib/globe/market/memory/market-memory-template";

export function syncMarketMemoryRecordOnDraft(
  draft: MarketIntentDraft,
  memoryPatch: Partial<MarketMemoryRecord>,
): MarketIntentDraft {
  const template = resolveMarketMemoryTemplate(
    draft.categoryId,
    draft.detail.productName || draft.title,
  );
  const merged: MarketMemoryRecord = {
    ...readMarketMemoryRecord(draft.detail),
    ...memoryPatch,
    templateId: template.id,
    schemaVersion: "market.memory.v1",
  };
  const experienceTags = generateMarketExperienceTags({
    categoryId: draft.categoryId,
    productName: draft.detail.productName || draft.title,
    placeLabel:
      draft.detail.memoryPlaceLabel?.trim() ||
      draft.placeLabel,
    memory: merged,
  });
  return {
    ...draft,
    detail: {
      ...draft.detail,
      memoryRecord: {
        ...merged,
        experienceTags,
      },
    },
  };
}
