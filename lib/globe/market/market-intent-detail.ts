export type MarketListingConditionId =
  | "like_new"
  | "good"
  | "fair"
  | "for_parts";

export type MarketMeetPreferenceId = "nearby" | "flexible" | "pickup_only";

import type { MarketPrioritySlotId } from "@/lib/globe/market/market-priority-matrix";

export type MarketPrioritySlotValues = Partial<
  Record<MarketPrioritySlotId, string | number | boolean | null>
>;

/** Extended slots — wizard + pinned product card (v1.2). */
export type MarketIntentDetail = {
  sourceText: string;
  productName: string;
  detailNote: string;
  conditionId: MarketListingConditionId | null;
  includesBox: boolean;
  includesReceipt: boolean;
  meetPreference: MarketMeetPreferenceId;
  priceNegotiable: boolean;
  photoCount: number;
  prioritySlots: MarketPrioritySlotValues;
  prioritySchemaVersion: "market.v1.2";
};

export const DEFAULT_MARKET_INTENT_DETAIL: MarketIntentDetail = {
  sourceText: "",
  productName: "",
  detailNote: "",
  conditionId: null,
  includesBox: false,
  includesReceipt: false,
  meetPreference: "nearby",
  priceNegotiable: false,
  photoCount: 0,
  prioritySlots: {},
  prioritySchemaVersion: "market.v1.2",
};

export function marketListingConditionLabelKo(
  id: MarketListingConditionId,
): string {
  switch (id) {
    case "like_new":
      return "거의 새것";
    case "good":
      return "사용감 적음";
    case "fair":
      return "사용감 있음";
    case "for_parts":
      return "부품·수리용";
    default:
      return id;
  }
}

export function marketMeetPreferenceLabelKo(id: MarketMeetPreferenceId): string {
  switch (id) {
    case "nearby":
      return "근처에서 만나기";
    case "flexible":
      return "장소 협의 가능";
    case "pickup_only":
      return "직접 수령만";
    default:
      return id;
  }
}
