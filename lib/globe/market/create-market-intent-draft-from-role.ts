import { DEFAULT_MARKET_INTENT_DETAIL } from "@/lib/globe/market/market-intent-detail";
import type {
  MarketIntentDraft,
  MarketIntentRole,
} from "@/lib/globe/market/market-intent-types";

/** Globe trade dock — role-first draft before product slots are filled. */
export function createMarketIntentDraftFromRole(input: {
  role: MarketIntentRole;
  eventId: string;
}): MarketIntentDraft {
  const sourceText = input.role === "listing" ? "내놓기" : "구하기";
  return {
    eventId: input.eventId,
    role: input.role,
    categoryId: "market.general",
    title: "",
    priceMinKrw: null,
    priceMaxKrw: null,
    radiusKm: 5,
    anchorLat: 0,
    anchorLng: 0,
    placeLabel: "",
    peakHour: null,
    prefillSources: ["trade_dock"],
    detail: {
      ...DEFAULT_MARKET_INTENT_DETAIL,
      sourceText,
      productName: "",
      prioritySlots: {},
      prioritySchemaVersion: "market.v1.2",
    },
  };
}
