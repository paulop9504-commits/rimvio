import type { LodgingRecommendScoreWire } from "@/lib/globe/context-hub/lodging-resource-types";

const STORAGE_KEY = "rimvio.globe.lodging-recommend-reasons.v1";

export function writeLodgingRecommendReasons(
  eventId: string,
  scores: Record<string, LodgingRecommendScoreWire>,
): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    parsed[eventId] = scores;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // quota / private mode
  }
}

export function readLodgingRecommendReason(
  eventId: string,
  placeId: string,
): LodgingRecommendScoreWire | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Record<
      string,
      Record<string, LodgingRecommendScoreWire>
    >;
    return parsed[eventId]?.[placeId] ?? null;
  } catch {
    return null;
  }
}

export function readLodgingRecommendReasonsForEvent(
  eventId: string,
): Record<string, LodgingRecommendScoreWire> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<
      string,
      Record<string, LodgingRecommendScoreWire>
    >;
    return parsed[eventId] ?? {};
  } catch {
    return {};
  }
}
