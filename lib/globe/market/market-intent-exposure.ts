import type {
  MarketIntentDetail,
  MarketIntentExposureMode,
} from "@/lib/globe/market/market-intent-detail";
import { isMarketIntentPublishedExternal } from "@/lib/globe/market/market-intent-detail";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import type { LiveLocationSnapshot } from "@/lib/location-ping/project-live-location-snapshot";
import { haversineKm } from "@/lib/globe/trend-bridge/server/trend-bridge-geo";

export const MARKET_INTENT_LIVE_EXPOSURE_MAX_AGE_MS = 30 * 60_000;
export const MARKET_INTENT_LIVE_EXPOSURE_SYNC_MOVE_M = 120;

export type MarketIntentExposureAnchor = {
  lat: number;
  lng: number;
  placeLabel: string;
  capturedAtIso: string | null;
  mode: MarketIntentExposureMode;
  source: "fixed" | "live";
};

export function readMarketIntentExposureMode(
  detail: Pick<MarketIntentDetail, "exposureMode"> | null | undefined,
): MarketIntentExposureMode {
  return detail?.exposureMode === "live" ? "live" : "fixed";
}

export function isMarketIntentLiveExposureEligible(
  record: Pick<MarketIntentRecord, "active" | "detail">,
): boolean {
  return record.active && isMarketIntentPublishedExternal(record.detail);
}

export function hasFreshMarketIntentLiveExposureAnchor(
  detail: Pick<
    MarketIntentDetail,
    "liveExposureLat" | "liveExposureLng" | "liveExposureCapturedAtIso"
  > | null | undefined,
  nowMs = Date.now(),
): boolean {
  const lat = detail?.liveExposureLat;
  const lng = detail?.liveExposureLng;
  if (
    lat == null ||
    lng == null ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    !detail?.liveExposureCapturedAtIso
  ) {
    return false;
  }
  const capturedMs = Date.parse(detail.liveExposureCapturedAtIso);
  if (Number.isNaN(capturedMs)) {
    return false;
  }
  return nowMs - capturedMs <= MARKET_INTENT_LIVE_EXPOSURE_MAX_AGE_MS;
}

export function resolveMarketIntentExposureAnchor(
  record: Pick<MarketIntentRecord, "anchorLat" | "anchorLng" | "placeLabel" | "detail" | "active">,
  nowMs = Date.now(),
): MarketIntentExposureAnchor {
  const mode = readMarketIntentExposureMode(record.detail);
  if (
    isMarketIntentLiveExposureEligible(record) &&
    mode === "live" &&
    hasFreshMarketIntentLiveExposureAnchor(record.detail, nowMs)
  ) {
    return {
      lat: record.detail.liveExposureLat!,
      lng: record.detail.liveExposureLng!,
      placeLabel:
        record.detail.liveExposurePlaceLabel?.trim() || record.placeLabel,
      capturedAtIso: record.detail.liveExposureCapturedAtIso ?? null,
      mode,
      source: "live",
    };
  }
  return {
    lat: record.anchorLat,
    lng: record.anchorLng,
    placeLabel: record.placeLabel,
    capturedAtIso: null,
    mode,
    source: "fixed",
  };
}

export function buildMarketIntentLiveExposureDetail(
  detail: MarketIntentDetail,
  snapshot: LiveLocationSnapshot,
): MarketIntentDetail {
  return {
    ...detail,
    liveExposureLat: snapshot.lat,
    liveExposureLng: snapshot.lng,
    liveExposurePlaceLabel: snapshot.placeLabel,
    liveExposureCapturedAtIso: snapshot.capturedAtIso,
  };
}

export function shouldSyncMarketIntentLiveExposureAnchor(
  record: Pick<MarketIntentRecord, "detail" | "active">,
  snapshot: LiveLocationSnapshot | null,
  nowMs = Date.now(),
): boolean {
  if (!snapshot || !isMarketIntentLiveExposureEligible(record)) {
    return false;
  }
  if (readMarketIntentExposureMode(record.detail) !== "live") {
    return false;
  }
  if (!hasFreshMarketIntentLiveExposureAnchor(record.detail, nowMs)) {
    return true;
  }
  if (record.detail.liveExposureCapturedAtIso === snapshot.capturedAtIso) {
    return false;
  }
  const currentLat = record.detail.liveExposureLat;
  const currentLng = record.detail.liveExposureLng;
  if (
    currentLat == null ||
    currentLng == null ||
    !Number.isFinite(currentLat) ||
    !Number.isFinite(currentLng)
  ) {
    return true;
  }
  return (
    haversineKm(currentLat, currentLng, snapshot.lat, snapshot.lng) * 1000 >=
    MARKET_INTENT_LIVE_EXPOSURE_SYNC_MOVE_M
  );
}
