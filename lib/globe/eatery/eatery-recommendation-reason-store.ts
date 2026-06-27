import type { EateryRecommendScoreWire } from "@/lib/globe/eatery/eatery-resource-types";

const STORAGE_KEY = "rimvio.globe.eatery-recommend-reasons.v1";

export function writeEateryRecommendReasons(
  eventId: string,
  scores: Record<string, EateryRecommendScoreWire>,
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

export function readEateryRecommendReason(
  eventId: string,
  placeId: string,
): EateryRecommendScoreWire | null {
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
      Record<string, EateryRecommendScoreWire>
    >;
    return parsed[eventId]?.[placeId] ?? null;
  } catch {
    return null;
  }
}
