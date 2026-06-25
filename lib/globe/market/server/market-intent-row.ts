import type { MarketCategoryId, MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import {
  DEFAULT_MARKET_INTENT_DETAIL,
  type MarketIntentDetail,
  type MarketMemoryRecord,
  DEFAULT_MARKET_MEMORY_RECORD,
  readMarketMemoryRecord,
  isMarketIntentPublishedExternal,
} from "@/lib/globe/market/market-intent-detail";

export type MarketIntentDbRow = {
  id: string;
  user_id: string;
  client_event_id: string;
  role: "listing" | "seeking";
  category_id: string;
  title: string;
  price_min_krw: number | null;
  price_max_krw: number | null;
  radius_km: number;
  anchor_lat: number;
  anchor_lng: number;
  place_label: string;
  peak_hour: string | null;
  active: boolean;
  confirmed_at: string;
  created_at: string;
  updated_at: string;
  detail_json?: Record<string, unknown> | null;
};

function readMemoryRecord(raw: Record<string, unknown> | null | undefined): MarketMemoryRecord {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_MARKET_MEMORY_RECORD };
  }
  const nested = raw.memoryRecord;
  if (nested && typeof nested === "object") {
    return readMarketMemoryRecord({ memoryRecord: nested as MarketMemoryRecord });
  }
  return { ...DEFAULT_MARKET_MEMORY_RECORD };
}

export function readDetailJson(raw: Record<string, unknown> | null | undefined): MarketIntentDetail {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_MARKET_INTENT_DETAIL };
  }
  return {
    ...DEFAULT_MARKET_INTENT_DETAIL,
    sourceText:
      typeof raw.sourceText === "string" ? raw.sourceText : DEFAULT_MARKET_INTENT_DETAIL.sourceText,
    productName:
      typeof raw.productName === "string"
        ? raw.productName
        : DEFAULT_MARKET_INTENT_DETAIL.productName,
    detailNote:
      typeof raw.detailNote === "string" ? raw.detailNote : DEFAULT_MARKET_INTENT_DETAIL.detailNote,
    conditionId:
      raw.conditionId === "sealed" ||
      raw.conditionId === "like_new" ||
      raw.conditionId === "good" ||
      raw.conditionId === "fair" ||
      raw.conditionId === "for_parts"
        ? raw.conditionId
        : null,
    includesBox: raw.includesBox === true,
    includesReceipt: raw.includesReceipt === true,
    meetPreference:
      raw.meetPreference === "nearby" ||
      raw.meetPreference === "flexible" ||
      raw.meetPreference === "pickup_only"
        ? raw.meetPreference
        : DEFAULT_MARKET_INTENT_DETAIL.meetPreference,
    priceNegotiable: raw.priceNegotiable === true,
    photoCount: typeof raw.photoCount === "number" ? raw.photoCount : 0,
    prioritySchemaVersion: "market.v1.2",
    prioritySlots:
      raw.prioritySlots && typeof raw.prioritySlots === "object" && !Array.isArray(raw.prioritySlots)
        ? (raw.prioritySlots as MarketIntentDetail["prioritySlots"])
        : {},
    memoryRecord: readMemoryRecord(raw),
    memoryPlaceLabel:
      typeof raw.memoryPlaceLabel === "string" ? raw.memoryPlaceLabel : undefined,
    memoryPlaceLat:
      typeof raw.memoryPlaceLat === "number" && Number.isFinite(raw.memoryPlaceLat)
        ? raw.memoryPlaceLat
        : null,
    memoryPlaceLng:
      typeof raw.memoryPlaceLng === "number" && Number.isFinite(raw.memoryPlaceLng)
        ? raw.memoryPlaceLng
        : null,
    photoUrls: Array.isArray(raw.photoUrls)
      ? raw.photoUrls.filter((url): url is string => typeof url === "string" && url.trim().length > 0)
      : [],
    publishedExternal: raw.publishedExternal === true,
  };
}

export function marketIntentDetailToJson(detail: MarketIntentDetail): Record<string, unknown> {
  return {
    sourceText: detail.sourceText,
    productName: detail.productName,
    detailNote: detail.detailNote,
    conditionId: detail.conditionId,
    includesBox: detail.includesBox,
    includesReceipt: detail.includesReceipt,
    meetPreference: detail.meetPreference,
    priceNegotiable: detail.priceNegotiable,
    photoCount: detail.photoCount,
    prioritySchemaVersion: detail.prioritySchemaVersion,
    prioritySlots: detail.prioritySlots,
    memoryRecord: detail.memoryRecord,
    memoryPlaceLabel: detail.memoryPlaceLabel,
    memoryPlaceLat: detail.memoryPlaceLat,
    memoryPlaceLng: detail.memoryPlaceLng,
    photoUrls: detail.photoUrls ?? [],
    publishedExternal: isMarketIntentPublishedExternal(detail),
  };
}

export function marketIntentRowToRecord(row: MarketIntentDbRow): MarketIntentRecord {
  return {
    id: row.id,
    userId: row.user_id,
    eventId: row.client_event_id,
    role: row.role,
    categoryId: row.category_id as MarketCategoryId,
    title: row.title,
    priceMinKrw: row.price_min_krw,
    priceMaxKrw: row.price_max_krw,
    radiusKm: Number(row.radius_km),
    anchorLat: row.anchor_lat,
    anchorLng: row.anchor_lng,
    placeLabel: row.place_label,
    peakHour: row.peak_hour,
    confirmedAtIso: row.confirmed_at,
    active: row.active,
    detail: readDetailJson(row.detail_json),
  };
}
