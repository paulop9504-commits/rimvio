/**
 * Impact Analyzer — Simulation Layer only.
 * Compares before/after → Price · Distance · Schedule · Relations.
 * Never writes Reality.
 *
 * UX: 가격 -3만원 · 이동 +5분 · 일정 영향
 */

import { parseWonAmount } from "@/lib/callout/simulation/parse-amount";
import type {
  RealityStateSlice,
  SimulationImpact,
} from "@/lib/simulation-engine/types";

function resolvePriceWon(slice: RealityStateSlice): number | null {
  if (slice.priceWon != null && Number.isFinite(slice.priceWon)) {
    return slice.priceWon;
  }
  return parseWonAmount(slice.priceLabelKo);
}

function formatPriceWon(won: number): string {
  return `${Math.round(won).toLocaleString("ko-KR")}원`;
}

function formatPriceDelta(delta: number): string {
  if (delta === 0) return "변동 없음";
  const abs = Math.abs(delta).toLocaleString("ko-KR");
  return delta < 0 ? `-${abs}원` : `+${abs}원`;
}

/** STEP 9 UX: -30000 → "가격 -3만원" */
export function formatPriceManwonUx(delta: number): string {
  if (delta === 0) return "가격 변동 없음";
  const man = delta / 10_000;
  const rounded = Math.round(man);
  if (Math.abs(man - rounded) < 0.05) {
    return rounded < 0 ? `가격 ${rounded}만원` : `가격 +${rounded}만원`;
  }
  return `가격 ${formatPriceDelta(delta)}`;
}

export function formatTravelDeltaUx(delta: number): string {
  if (delta === 0) return "이동 변동 없음";
  return delta > 0 ? `이동 +${delta}분` : `이동 ${delta}분`;
}

function formatTravelDelta(delta: number): string {
  if (delta === 0) return "변동 없음";
  return delta > 0 ? `+${delta}분` : `${delta}분`;
}

function formatRatingDelta(delta: number): string {
  if (delta === 0) return "변동 없음";
  const rounded = Math.round(delta * 10) / 10;
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function inferTravelMinutesDelta(
  before: RealityStateSlice,
  after: RealityStateSlice,
): number | null {
  if (
    before.lat == null ||
    before.lng == null ||
    after.lat == null ||
    after.lng == null
  ) {
    return null;
  }
  const meters = haversineMeters(
    { lat: before.lat, lng: before.lng },
    { lat: after.lat, lng: after.lng },
  );
  if (!Number.isFinite(meters) || meters < 40) return 0;
  return Math.max(1, Math.round(meters / 80));
}

function distanceMetersDelta(
  before: RealityStateSlice,
  after: RealityStateSlice,
): number | null {
  if (
    before.lat == null ||
    before.lng == null ||
    after.lat == null ||
    after.lng == null
  ) {
    return null;
  }
  const meters = haversineMeters(
    { lat: before.lat, lng: before.lng },
    { lat: after.lat, lng: after.lng },
  );
  return Number.isFinite(meters) ? Math.round(meters) : null;
}

function attrMinutes(
  slice: RealityStateSlice,
  key: string,
): number | null {
  const v = slice.attrs?.[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function minutesDelta(
  before: RealityStateSlice,
  after: RealityStateSlice,
  key: string,
): number | null {
  const b = attrMinutes(before, key);
  const a = attrMinutes(after, key);
  if (b == null || a == null) return null;
  return a - b;
}

function relatedPlaceIds(slice: RealityStateSlice): readonly string[] {
  const raw = slice.attrs?.relatedPlaceIds;
  if (Array.isArray(raw)) {
    return raw.map(String).filter(Boolean);
  }
  return [];
}

function analyzeRelations(
  before: RealityStateSlice,
  after: RealityStateSlice,
): {
  readonly affected: readonly string[];
  readonly summaryKo: string | null;
} {
  const beforeIds = new Set(relatedPlaceIds(before));
  const afterIds = new Set(relatedPlaceIds(after));
  const affected: string[] = [];
  for (const id of afterIds) {
    if (!beforeIds.has(id)) affected.push(`+${id}`);
  }
  for (const id of beforeIds) {
    if (!afterIds.has(id)) affected.push(`-${id}`);
  }
  // Shared relations still "touched" by hotel move
  if (affected.length === 0 && (beforeIds.size > 0 || afterIds.size > 0)) {
    const shared = [...beforeIds].filter((id) => afterIds.has(id));
    if (shared.length > 0) {
      return {
        affected: shared.map((id) => `~${id}`),
        summaryKo: `관계 ${shared.length}개 재계산`,
      };
    }
  }
  if (affected.length === 0) {
    return { affected: [], summaryKo: null };
  }
  return {
    affected,
    summaryKo: `관계 영향 ${affected.length}개`,
  };
}

function analyzeSchedule(
  before: RealityStateSlice,
  after: RealityStateSlice,
  travelMinutesDelta: number | null,
): {
  readonly scheduleMinutesDelta: number | null;
  readonly scheduleImpactKo: string | null;
} {
  const loadDelta = minutesDelta(before, after, "scheduleLoadMinutes");
  if (loadDelta != null && loadDelta !== 0) {
    return {
      scheduleMinutesDelta: loadDelta,
      scheduleImpactKo:
        loadDelta > 0
          ? `일정 영향 · +${loadDelta}분`
          : `일정 영향 · ${loadDelta}분`,
    };
  }
  // Hotel change with travel ripple ⇒ schedule affected
  if (travelMinutesDelta != null && travelMinutesDelta !== 0) {
    return {
      scheduleMinutesDelta: travelMinutesDelta,
      scheduleImpactKo: "일정 영향",
    };
  }
  if (
    before.kind === "hotel" &&
    after.kind === "hotel" &&
    before.objectId !== after.objectId
  ) {
    return {
      scheduleMinutesDelta: travelMinutesDelta,
      scheduleImpactKo: "일정 영향",
    };
  }
  return { scheduleMinutesDelta: null, scheduleImpactKo: null };
}

/**
 * Pure impact: Current Reality State vs Possible Change target + ripple.
 */
export function analyzeSimulationImpact(
  before: RealityStateSlice,
  after: RealityStateSlice,
): SimulationImpact {
  const beforePrice = resolvePriceWon(before);
  const afterPrice = resolvePriceWon(after);
  const priceWonDelta =
    beforePrice != null && afterPrice != null
      ? afterPrice - beforePrice
      : null;

  let travelMinutesDelta: number | null = null;
  if (before.travelMinutes != null && after.travelMinutes != null) {
    travelMinutesDelta = after.travelMinutes - before.travelMinutes;
  } else {
    travelMinutesDelta = inferTravelMinutesDelta(before, after);
  }

  const distDelta = distanceMetersDelta(before, after);

  const ratingDelta =
    before.rating != null &&
    after.rating != null &&
    Number.isFinite(before.rating) &&
    Number.isFinite(after.rating)
      ? Math.round((after.rating - before.rating) * 10) / 10
      : null;

  const foodAccessMinutesDelta = minutesDelta(
    before,
    after,
    "foodAccessMinutes",
  );
  const usjMinutesDelta = minutesDelta(before, after, "usjMinutes");
  const airportMinutesDelta = minutesDelta(before, after, "airportMinutes");

  const schedule = analyzeSchedule(before, after, travelMinutesDelta);
  const relations = analyzeRelations(before, after);

  const rippleEffects: string[] = [];
  if (priceWonDelta != null && priceWonDelta !== 0) {
    rippleEffects.push(`가격 ${formatPriceDelta(priceWonDelta)}`);
  }
  if (travelMinutesDelta != null && travelMinutesDelta !== 0) {
    rippleEffects.push(`이동시간 ${formatTravelDelta(travelMinutesDelta)}`);
  }
  if (distDelta != null && distDelta > 40) {
    rippleEffects.push(`거리 +${distDelta}m`);
  }
  if (schedule.scheduleImpactKo) {
    rippleEffects.push(schedule.scheduleImpactKo);
  }
  if (relations.summaryKo) {
    rippleEffects.push(relations.summaryKo);
  }
  if (foodAccessMinutesDelta != null && foodAccessMinutesDelta !== 0) {
    rippleEffects.push(
      `맛집 접근성 ${formatTravelDelta(foodAccessMinutesDelta)}`,
    );
  }
  if (usjMinutesDelta != null && usjMinutesDelta !== 0) {
    rippleEffects.push(`USJ 거리 ${formatTravelDelta(usjMinutesDelta)}`);
  }
  if (airportMinutesDelta != null && airportMinutesDelta !== 0) {
    rippleEffects.push(`공항 접근성 ${formatTravelDelta(airportMinutesDelta)}`);
  }

  const linesKo: string[] = [];
  if (afterPrice != null) {
    linesKo.push(`가격: ${formatPriceWon(afterPrice)}`);
  } else if (after.priceLabelKo) {
    linesKo.push(`가격: ${after.priceLabelKo}`);
  }
  if (priceWonDelta != null) {
    linesKo.push(`가격 변동: ${formatPriceDelta(priceWonDelta)}`);
  }
  if (travelMinutesDelta != null) {
    linesKo.push(`이동: ${formatTravelDelta(travelMinutesDelta)}`);
  }
  if (distDelta != null) {
    linesKo.push(`거리: ${distDelta}m`);
  }
  if (schedule.scheduleImpactKo) {
    linesKo.push(schedule.scheduleImpactKo);
  }
  if (relations.summaryKo) {
    linesKo.push(relations.summaryKo);
  }
  if (ratingDelta != null) {
    linesKo.push(`평점: ${formatRatingDelta(ratingDelta)}`);
  }
  if (foodAccessMinutesDelta != null) {
    linesKo.push(`맛집 접근성: ${formatTravelDelta(foodAccessMinutesDelta)}`);
  }
  if (usjMinutesDelta != null) {
    linesKo.push(`USJ 거리: ${formatTravelDelta(usjMinutesDelta)}`);
  }
  if (airportMinutesDelta != null) {
    linesKo.push(`공항 접근성: ${formatTravelDelta(airportMinutesDelta)}`);
  }

  if (linesKo.length === 0) {
    linesKo.push("측정 가능한 영향이 없어요");
  }

  const uxLinesKo: string[] = [];
  if (priceWonDelta != null) {
    uxLinesKo.push(formatPriceManwonUx(priceWonDelta));
  }
  if (travelMinutesDelta != null) {
    uxLinesKo.push(formatTravelDeltaUx(travelMinutesDelta));
  }
  if (schedule.scheduleImpactKo) {
    uxLinesKo.push(
      schedule.scheduleImpactKo.startsWith("일정")
        ? "일정 영향"
        : schedule.scheduleImpactKo,
    );
  }
  if (relations.summaryKo) {
    uxLinesKo.push(relations.summaryKo);
  }

  const summaryKo = [
    `${before.title} → ${after.title}`,
    ...rippleEffects.slice(0, 3),
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    priceWonDelta,
    travelMinutesDelta,
    ratingDelta,
    distanceMetersDelta: distDelta,
    scheduleImpactKo: schedule.scheduleImpactKo,
    scheduleMinutesDelta: schedule.scheduleMinutesDelta,
    relationsAffected: relations.affected,
    relationsSummaryKo: relations.summaryKo,
    foodAccessMinutesDelta,
    usjMinutesDelta,
    airportMinutesDelta,
    rippleEffects,
    summaryKo,
    linesKo,
    uxLinesKo,
    details: {
      beforePriceWon: beforePrice,
      afterPriceWon: afterPrice,
      beforeTravelMinutes: before.travelMinutes,
      afterTravelMinutes: after.travelMinutes,
      beforeRating: before.rating,
      afterRating: after.rating,
      rippleCount: rippleEffects.length,
      axes: ["price", "distance", "schedule", "relations"],
    },
  };
}

export function simulationImpactLinesKo(
  impact: SimulationImpact,
): readonly string[] {
  return impact.linesKo;
}

/**
 * UX card:
 *
 * 호텔 변경하면?
 * 가격 -3만원
 * 이동 +5분
 * 일정 영향
 */
export function formatHotelChangeSimulationUxKo(
  result: {
    readonly before: RealityStateSlice;
    readonly after: RealityStateSlice;
    readonly impact: SimulationImpact;
  },
  promptKo = "호텔 변경하면?",
): string {
  const lines = [promptKo, ...result.impact.uxLinesKo];
  if (result.impact.uxLinesKo.length === 0) {
    lines.push(...result.impact.linesKo.slice(0, 3));
  }
  return lines.join("\n");
}
