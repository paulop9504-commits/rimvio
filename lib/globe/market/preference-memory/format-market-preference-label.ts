import { marketListingConditionLabelKo } from "@/lib/globe/market/market-intent-detail";
import type { MarketListingConditionId } from "@/lib/globe/market/market-intent-detail";
import { marketPrioritySlotLabelKo } from "@/lib/globe/market/market-priority-matrix";
import type { MarketPrioritySlotId } from "@/lib/globe/market/market-priority-matrix";
import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";

export function formatMarketPreferenceValueLabelKo(input: {
  slotId: MarketPrioritySlotId;
  value: string | number | boolean;
  role: MarketIntentRole;
}): string {
  const { slotId, value, role } = input;

  if (slotId === "battery_health" && typeof value === "number") {
    return role === "seeking" ? `배터리 ${value}% 이상` : `배터리 ${value}%`;
  }

  if (slotId === "storage_gb" && typeof value === "number") {
    return role === "seeking" ? `${value}GB 이상` : `${value}GB`;
  }

  if (slotId === "price" && typeof value === "number") {
    const man = Math.round(value / 10_000);
    return role === "seeking" ? `${man}만원대` : `${man}만원`;
  }

  if (slotId === "cosmetic_grade" && typeof value === "string") {
    const id = value as MarketListingConditionId;
    if (id === "sealed" || id === "like_new" || id === "good" || id === "fair" || id === "for_parts") {
      return `외관 ${marketListingConditionLabelKo(id)}`;
    }
  }

  if (slotId === "condition_abc" && typeof value === "string") {
    return `상태 ${value}급`;
  }

  if (slotId === "repair_history") {
    if (value === true) {
      return role === "seeking" ? "수리 이력 없음" : "수리 이력 없음";
    }
    if (value === "any") {
      return "수리 이력 상관없음";
    }
    return "수리 이력 있음";
  }

  if (typeof value === "string" && value.trim()) {
    const label = marketPrioritySlotLabelKo(slotId);
    return `${label} ${value.trim()}`;
  }

  return marketPrioritySlotLabelKo(slotId);
}

export function formatMarketPreferenceConfirmPrompt(input: {
  valueLabelKo: string;
  role: MarketIntentRole;
}): string {
  const verb = input.role === "seeking" ? "선호하셨어요" : "적어 두셨어요";
  return `지난번에도 ${input.valueLabelKo}을 ${verb}.\n그대로 적용할까요?`;
}
