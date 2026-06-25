import {
  getWeightedPrioritySlots,
  marketPrioritySlotLabelKo,
  type MarketPrioritySlotId,
} from "@/lib/globe/market/market-priority-matrix";
import { scoreWeightedMarketAlignment } from "@/lib/globe/market/score-weighted-market-alignment";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";

export type MarketAlignmentGapChip = {
  label: string;
  value: string | number | boolean;
};

export type MarketAlignmentGapAsk = {
  field: MarketPrioritySlotId;
  labelKo: string;
  promptKo: string;
  chips: readonly MarketAlignmentGapChip[];
};

function isSlotEmpty(record: MarketIntentRecord, field: MarketPrioritySlotId): boolean {
  if (field === "price") {
    return record.priceMinKrw === null && record.priceMaxKrw === null;
  }
  const value = record.detail.prioritySlots[field];
  return value === undefined || value === null || value === "";
}

function readMatchSlotValue(
  record: MarketIntentRecord,
  field: MarketPrioritySlotId,
): string | number | boolean | null {
  if (field === "price") {
    const krw = record.priceMaxKrw ?? record.priceMinKrw;
    return krw;
  }
  const value = record.detail.prioritySlots[field];
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return value;
}

function buildChipsForField(
  field: MarketPrioritySlotId,
  match: MarketIntentRecord,
): readonly MarketAlignmentGapChip[] {
  const matchValue = readMatchSlotValue(match, field);
  switch (field) {
    case "battery_health":
      return [
        { label: "80%", value: 80 },
        { label: "85%", value: 85 },
        { label: "90%", value: 90 },
        { label: "95%", value: 95 },
      ];
    case "storage_gb":
      return [
        { label: "128GB", value: 128 },
        { label: "256GB", value: 256 },
        { label: "512GB", value: 512 },
        { label: "1TB", value: 1024 },
      ];
    case "cosmetic_grade":
      return [
        { label: "미개봉", value: "sealed" },
        { label: "거의 새것", value: "like_new" },
        { label: "사용감 적음", value: "good" },
      ];
    case "condition_abc":
      return [
        { label: "A", value: "A" },
        { label: "B", value: "B" },
        { label: "C", value: "C" },
      ];
    case "price": {
      const krw = typeof matchValue === "number" ? matchValue : null;
      if (krw !== null && krw >= 10_000) {
        return [{ label: `${Math.round(krw / 10_000)}만원`, value: krw }];
      }
      return [{ label: "협의", value: "negotiable" }];
    }
    case "model_year":
      if (typeof matchValue === "string" && matchValue.trim()) {
        return [{ label: matchValue.trim(), value: matchValue.trim() }];
      }
      return [{ label: "상관없음", value: "any" }];
    case "color_design":
      if (typeof matchValue === "string" && matchValue.trim()) {
        return [{ label: matchValue.trim(), value: matchValue.trim() }];
      }
      return [];
    case "repair_history":
      return [
        { label: "수리 없음", value: false },
        { label: "상관없음", value: "any" },
      ];
    default:
      return [];
  }
}

/** One missing slot that most improves alignment vs top match. */
export function resolveMarketAlignmentGapAsk(input: {
  self: MarketIntentRecord;
  match: MarketIntentRecord;
  copy: {
    prompt: (label: string) => string;
  };
}): MarketAlignmentGapAsk | null {
  const weighted = scoreWeightedMarketAlignment(input.self, input.match);

  const categoryId =
    input.self.categoryId === "market.general"
      ? input.match.categoryId
      : input.self.categoryId;
  const slots = getWeightedPrioritySlots(categoryId);

  let best: { field: MarketPrioritySlotId; gain: number } | null = null;
  for (const slot of slots) {
    if (!isSlotEmpty(input.self, slot.field)) {
      continue;
    }
    const row = weighted.breakdown.find((entry) => entry.field === slot.field);
    const matchScore = row?.match ?? 0.55;
    if (matchScore >= 0.88) {
      continue;
    }
    const gain = slot.weight * (1 - matchScore);
    if (!best || gain > best.gain) {
      best = { field: slot.field, gain };
    }
  }

  if (!best) {
    return null;
  }

  const chips = buildChipsForField(best.field, input.match);
  if (chips.length === 0) {
    return null;
  }

  const labelKo = marketPrioritySlotLabelKo(best.field);
  return {
    field: best.field,
    labelKo,
    promptKo: input.copy.prompt(labelKo),
    chips,
  };
}
