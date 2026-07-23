/**
 * Trip frame + day index + named POI → search_project IR (no LLM).
 * Enables live Globe Diff pins for utterances like:
 * 「4박5일 오사카 여행, 2일차 유니버셜 스튜디오」
 */

import { resolveWorldGeoEntity } from "@/lib/reality-graph/resolve-world-geo";
import type { GraphCommand } from "@/lib/graph-command/types";

const TRIP_FRAME_RE =
  /(?:여행|trip|출장|박\s*\d|\d\s*박|\d\s*일|일차)/iu;
const PLAN_NIGHTS_RE = /(\d{1,2})\s*박(?:\s*(\d{1,2})\s*일)?/iu;
const PLAN_DAY_INDEX_RE = /(\d{1,2})\s*일차/iu;
const CITY_CUE_RE =
  /(?:오사카|도쿄|교토|후쿠오카|삿포로|나고야|부산|서울|제주|오키나와|osaka|tokyo|kyoto)/iu;

export type TripDayPoiParse = {
  readonly planDayIndex: number | null;
  readonly planNights: number | null;
  readonly destinationLabelKo: string | null;
  readonly poiLabelKo: string;
  readonly query: string;
};

export function parsePlanDayIndexFromText(text: string): number | null {
  const m = text.match(PLAN_DAY_INDEX_RE);
  if (!m?.[1]) {
    return null;
  }
  const day = Number.parseInt(m[1], 10);
  return day >= 1 && day <= 31 ? day : null;
}

export function parsePlanNightsFromText(text: string): number | null {
  const m = text.match(PLAN_NIGHTS_RE);
  if (!m?.[1]) {
    return null;
  }
  const nights = Number.parseInt(m[1], 10);
  return nights >= 1 && nights <= 60 ? nights : null;
}

function resolveDestinationCityFromText(
  text: string,
  excludePoiId: string,
): string | null {
  const cityCue = text.match(CITY_CUE_RE)?.[0] ?? null;
  if (!cityCue) {
    return null;
  }
  const hit = resolveWorldGeoEntity(cityCue);
  if (!hit || hit.node.id === excludePoiId || hit.node.kind === "poi") {
    return null;
  }
  return hit.node.labels.ko;
}

/**
 * Prefer city/prefecture for destination; POI for the named activity.
 */
export function parseTripDayPoiFromText(text: string): TripDayPoiParse | null {
  const raw = text.trim();
  if (!raw || raw.length < 4) {
    return null;
  }
  if (!TRIP_FRAME_RE.test(raw)) {
    return null;
  }

  const geoHit = resolveWorldGeoEntity(raw);
  if (!geoHit || geoHit.node.kind !== "poi") {
    return null;
  }

  const planDayIndex = parsePlanDayIndexFromText(raw);
  const planNights = parsePlanNightsFromText(raw);
  const destinationLabelKo = resolveDestinationCityFromText(
    raw,
    geoHit.node.id,
  );
  const poiLabelKo = geoHit.node.labels.ko;

  if (!planDayIndex && !planNights && !destinationLabelKo) {
    return null;
  }

  return {
    planDayIndex,
    planNights,
    destinationLabelKo,
    poiLabelKo,
    query: poiLabelKo,
  };
}

/** Graph IR for trip-day POI — search cue optional. */
export function parseTripDayPoiSearchProject(
  text: string,
): Extract<GraphCommand, { op: "search_project" }> | null {
  const parsed = parseTripDayPoiFromText(text);
  if (!parsed) {
    return null;
  }
  return {
    op: "search_project",
    query: parsed.query,
    domain: "poi",
    anchorRef: null,
    planDayIndex: parsed.planDayIndex,
    planNights: parsed.planNights,
    destinationLabelKo: parsed.destinationLabelKo,
  };
}
