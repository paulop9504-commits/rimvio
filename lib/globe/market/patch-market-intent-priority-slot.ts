import {
  findMarketIntentByEventId,
  saveMarketIntent,
  stampMarketIntentOnEvent,
} from "@/lib/globe/market/market-alignment-store";
import type { MarketPrioritySlotId } from "@/lib/globe/market/market-priority-matrix";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";

export function patchMarketIntentPrioritySlot(input: {
  eventId: string;
  field: MarketPrioritySlotId;
  value: string | number | boolean | null;
}): MarketIntentRecord | null {
  const key = input.eventId.trim();
  const existing = findMarketIntentByEventId(key);
  if (!existing) {
    return null;
  }

  let priceMinKrw = existing.priceMinKrw;
  let priceMaxKrw = existing.priceMaxKrw;
  const prioritySlots = { ...existing.detail.prioritySlots };

  if (input.field === "price") {
    if (input.value === "negotiable") {
      priceMinKrw = null;
      priceMaxKrw = null;
      prioritySlots.price = null;
    } else if (typeof input.value === "number") {
      priceMinKrw = input.value;
      priceMaxKrw = input.value;
      prioritySlots.price = input.value;
    }
  } else {
    prioritySlots[input.field] = input.value;
  }

  const next: MarketIntentRecord = {
    ...existing,
    priceMinKrw,
    priceMaxKrw,
    detail: {
      ...existing.detail,
      prioritySlots,
      priceNegotiable:
        input.field === "price" && input.value === "negotiable"
          ? true
          : existing.detail.priceNegotiable,
    },
  };

  saveMarketIntent(next);
  stampMarketIntentOnEvent(next);
  return next;
}
