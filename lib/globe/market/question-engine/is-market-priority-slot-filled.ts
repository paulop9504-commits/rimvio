import type { MarketIntentDetail } from "@/lib/globe/market/market-intent-detail";
import type { MarketPrioritySlotId } from "@/lib/globe/market/market-priority-matrix";

function isPresent(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  return true;
}

/** Already captured — do not re-ask (question engine rule #4). */
export function isMarketPrioritySlotFilled(input: {
  slotId: MarketPrioritySlotId;
  prioritySlots?: MarketIntentDetail["prioritySlots"];
  priceMinKrw?: number | null;
  priceMaxKrw?: number | null;
  conditionId?: MarketIntentDetail["conditionId"];
}): boolean {
  const slots = input.prioritySlots ?? {};
  const slotValue = slots[input.slotId];
  if (isPresent(slotValue)) {
    return true;
  }

  if (input.slotId === "price") {
    return input.priceMinKrw !== null || input.priceMaxKrw !== null;
  }

  if (input.slotId === "cosmetic_grade" && input.conditionId) {
    return true;
  }

  if (input.slotId === "condition_abc" && input.conditionId) {
    return true;
  }

  return false;
}
