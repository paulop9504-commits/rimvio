import type { MarketListingConditionId } from "@/lib/globe/market/market-intent-detail";
import type { MarketIntentDraft } from "@/lib/globe/market/market-intent-types";
import type { MarketPrioritySlotId } from "@/lib/globe/market/market-priority-matrix";

const COSMETIC_CONDITION_IDS = new Set<MarketListingConditionId>([
  "sealed",
  "like_new",
  "good",
  "fair",
  "for_parts",
]);

/** Wizard draft — keep price + conditionId in sync with prioritySlots. */
export function patchMarketDraftPrioritySlot(
  draft: MarketIntentDraft,
  field: MarketPrioritySlotId,
  value: string | number | boolean | null,
): MarketIntentDraft {
  const prioritySlots = { ...draft.detail.prioritySlots, [field]: value };
  let priceMinKrw = draft.priceMinKrw;
  let priceMaxKrw = draft.priceMaxKrw;
  let conditionId = draft.detail.conditionId;
  let priceNegotiable = draft.detail.priceNegotiable;

  if (field === "price") {
    if (value === "negotiable") {
      priceMinKrw = null;
      priceMaxKrw = null;
      prioritySlots.price = null;
      priceNegotiable = true;
    } else if (typeof value === "number" && value > 0) {
      priceMinKrw = value;
      priceMaxKrw = value;
      prioritySlots.price = value;
      priceNegotiable = false;
    }
  }

  if (field === "cosmetic_grade" && typeof value === "string") {
    if (COSMETIC_CONDITION_IDS.has(value as MarketListingConditionId)) {
      conditionId = value as MarketListingConditionId;
    }
  }

  if (field === "condition_abc" && typeof value === "string") {
    const map: Record<string, MarketListingConditionId> = {
      A: "like_new",
      B: "good",
      C: "fair",
      S: "sealed",
      D: "for_parts",
    };
    conditionId = map[value] ?? conditionId;
  }

  return {
    ...draft,
    priceMinKrw,
    priceMaxKrw,
    detail: {
      ...draft.detail,
      conditionId,
      priceNegotiable,
      prioritySlots,
    },
  };
}

export function normalizeMarketIntentDraftFromPrioritySlots(
  draft: MarketIntentDraft,
): MarketIntentDraft {
  const slots = draft.detail.prioritySlots ?? {};
  let next = draft;

  const slotPrice = slots.price;
  if (
    draft.priceMinKrw === null &&
    draft.priceMaxKrw === null &&
    typeof slotPrice === "number" &&
    slotPrice > 0
  ) {
    next = patchMarketDraftPrioritySlot(next, "price", slotPrice);
  }

  if (!next.detail.conditionId && typeof slots.cosmetic_grade === "string") {
    next = patchMarketDraftPrioritySlot(
      next,
      "cosmetic_grade",
      slots.cosmetic_grade,
    );
  }

  return next;
}
