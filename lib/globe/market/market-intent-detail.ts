export type MarketListingConditionId =
  | "sealed"
  | "like_new"
  | "good"
  | "fair"
  | "for_parts";

export type MarketMeetPreferenceId = "nearby" | "flexible" | "pickup_only";
export type MarketIntentExposureMode = "fixed" | "live";

import type { MarketAvailabilityPreset } from "@/lib/globe/market/market-availability-preset";
import { DEFAULT_MARKET_AVAILABILITY_PRESET } from "@/lib/globe/market/market-availability-preset";
import type { MarketPrioritySlotId } from "@/lib/globe/market/market-priority-matrix";
import { MARKET_MEMORY_SCHEMA_VERSION } from "@/lib/globe/market/memory/market-memory-template";

export type MarketPrioritySlotValues = Partial<
  Record<MarketPrioritySlotId, string | number | boolean | null>
>;

export type MarketMemoryRecord = {
  schemaVersion: typeof MARKET_MEMORY_SCHEMA_VERSION;
  templateId: string;
  story: string;
  care: string;
  why: string;
  categoryAnswer: string;
  seekingContext: string;
  seekingWhy: string;
  experienceTags: string[];
};

export const DEFAULT_MARKET_MEMORY_RECORD: MarketMemoryRecord = {
  schemaVersion: MARKET_MEMORY_SCHEMA_VERSION,
  templateId: "universal",
  story: "",
  care: "",
  why: "",
  categoryAnswer: "",
  seekingContext: "",
  seekingWhy: "",
  experienceTags: [],
};

/** Extended slots — wizard + pinned product card (v1.2). */
export type MarketIntentDetail = {
  sourceText: string;
  productName: string;
  detailNote: string;
  conditionId: MarketListingConditionId | null;
  includesBox: boolean;
  includesReceipt: boolean;
  meetPreference: MarketMeetPreferenceId;
  /** When seller can meet — drives Pull schedule candidates (listing only). */
  availabilityPreset: MarketAvailabilityPreset;
  priceNegotiable: boolean;
  photoCount: number;
  prioritySlots: MarketPrioritySlotValues;
  prioritySchemaVersion: "market.v1.2";
  memoryRecord: MarketMemoryRecord;
  /** Photo EXIF / experience place — separate from trade anchor. */
  memoryPlaceLabel?: string;
  memoryPlaceLat?: number | null;
  memoryPlaceLng?: number | null;
  /** Public URLs — uploaded on listing confirm for handshake chat. */
  photoUrls?: string[];
  /** Short listing clip — shown on opportunity field for buyers. */
  videoUrls?: string[];
  videoCount?: number;
  /** Portal gate — true only after explicit 외부 공개 on review or manage. */
  publishedExternal?: boolean;
  /** Nearby discovery anchor behavior — canonical trade anchor stays untouched. */
  exposureMode?: MarketIntentExposureMode;
  /** Live exposure anchor for mobile/external contexts. */
  liveExposureLat?: number | null;
  liveExposureLng?: number | null;
  liveExposurePlaceLabel?: string;
  liveExposureCapturedAtIso?: string | null;
};

export function isMarketIntentPublishedExternal(
  detail: Pick<MarketIntentDetail, "publishedExternal"> | null | undefined,
): boolean {
  return detail?.publishedExternal === true;
}

export function readMarketMemoryRecord(
  detail: Pick<MarketIntentDetail, "memoryRecord"> | { memoryRecord?: MarketMemoryRecord | null },
): MarketMemoryRecord {
  const raw = detail.memoryRecord;
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_MARKET_MEMORY_RECORD };
  }
  return {
    ...DEFAULT_MARKET_MEMORY_RECORD,
    ...raw,
    experienceTags: Array.isArray(raw.experienceTags)
      ? raw.experienceTags.filter((tag) => typeof tag === "string")
      : [],
  };
}

export const DEFAULT_MARKET_INTENT_DETAIL: MarketIntentDetail = {
  sourceText: "",
  productName: "",
  detailNote: "",
  conditionId: null,
  includesBox: false,
  includesReceipt: false,
  meetPreference: "nearby",
  availabilityPreset: DEFAULT_MARKET_AVAILABILITY_PRESET,
  priceNegotiable: false,
  photoCount: 0,
  prioritySlots: {},
  prioritySchemaVersion: "market.v1.2",
  memoryRecord: { ...DEFAULT_MARKET_MEMORY_RECORD },
  exposureMode: "fixed",
  liveExposureLat: null,
  liveExposureLng: null,
  liveExposurePlaceLabel: "",
  liveExposureCapturedAtIso: null,
};

export function marketListingConditionLabelKo(
  id: MarketListingConditionId,
): string {
  switch (id) {
    case "sealed":
      return "미개봉";
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

export { marketAvailabilityPresetLabelKo } from "@/lib/globe/market/market-availability-preset";
