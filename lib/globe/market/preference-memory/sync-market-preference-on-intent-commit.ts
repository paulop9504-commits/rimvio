import { resolveMarketQuestionCategorySlug } from "@/lib/globe/market/question-engine/resolve-market-question-category";
import { recordMarketPreferenceSignal } from "@/lib/globe/market/preference-memory/record-market-preference-signal";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import type { MarketPrioritySlotId } from "@/lib/globe/market/market-priority-matrix";

const SLOT_FACTOR_KEYS: Partial<Record<MarketPrioritySlotId, string>> = {
  battery_health: "batteryHealth",
  storage_gb: "storageCapacity",
  cosmetic_grade: "scratchLevel",
  repair_history: "repairHistory",
  price: "price",
  model_year: "usagePeriod",
  condition_abc: "condition",
  working_state: "workingState",
  color_design: "colorDesign",
  size_type: "sizeType",
  distance: "distance",
};

/** After intent commit — reinforce prefs that shipped in prioritySlots. */
export function syncMarketPreferenceOnIntentCommit(record: MarketIntentRecord): void {
  if (typeof window === "undefined") {
    return;
  }

  const corpus = `${record.detail.productName} ${record.detail.sourceText}`.trim();
  const categorySlug = resolveMarketQuestionCategorySlug({
    text: corpus,
    productName: record.detail.productName,
    categoryId: record.categoryId,
  });

  for (const [slotId, value] of Object.entries(record.detail.prioritySlots ?? {})) {
    if (value === null || value === undefined || value === "") {
      continue;
    }
    recordMarketPreferenceSignal({
      categorySlug,
      categoryId: record.categoryId,
      role: record.role,
      slotId: slotId as MarketPrioritySlotId,
      factorKey: SLOT_FACTOR_KEYS[slotId as MarketPrioritySlotId] ?? slotId,
      value: value as string | number | boolean,
      kind: "trade_complete",
    });
  }
}
