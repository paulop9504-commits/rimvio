import type { ContextInstance } from "@/lib/context-instance/build-context-instance";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import type { UnifiedExperienceContext } from "@/lib/experience-context/unified-experience-context-types";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import {
  explainLodgingRecommendationKo,
  type LodgingRecommendReasonInput,
} from "@/lib/globe/lodging/explain-lodging-recommendation-ko";
import { findLatestPersonaSignal } from "@/lib/persona/persona-inference-store";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { scoreBusinessTripLodgingBias } from "@/lib/globe/lodging/score-business-trip-lodging-bias";

export type ScoredLodgingRecommendation = {
  row: ContextLodgingInventoryRow;
  score: number;
  reasonKo: string;
  matchReasons: string[];
};

function normalizePlaceToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, "");
}

function findPeoplePlaceMatch(
  row: ContextLodgingInventoryRow,
  unified: UnifiedExperienceContext,
): { displayName: string; placeLabel: string } | null {
  const lodgingToken = normalizePlaceToken(row.name);
  if (!lodgingToken) {
    return null;
  }

  for (const slice of unified.personExperienceSlice) {
    for (const place of slice.places) {
      const label = place.label?.trim();
      if (!label) {
        continue;
      }
      const placeToken = normalizePlaceToken(label);
      if (
        lodgingToken.includes(placeToken) ||
        placeToken.includes(lodgingToken) ||
        lodgingToken.includes(placeToken.slice(0, Math.min(4, placeToken.length)))
      ) {
        return { displayName: slice.displayName, placeLabel: label };
      }
    }
  }
  return null;
}

function scoreDistance(lat: number | null, lng: number | null, row: ContextLodgingInventoryRow): {
  bonus: number;
  distanceKm: number | null;
} {
  if (lat == null || lng == null) {
    return { bonus: 0, distanceKm: null };
  }
  const distanceKm = haversineKm(lat, lng, row.lat, row.lng);
  if (distanceKm <= 1) {
    return { bonus: 120, distanceKm };
  }
  if (distanceKm <= 3) {
    return { bonus: 95, distanceKm };
  }
  if (distanceKm <= 8) {
    return { bonus: 55, distanceKm };
  }
  if (distanceKm <= 15) {
    return { bonus: 20, distanceKm };
  }
  return { bonus: 0, distanceKm };
}

function scorePrice(priceKrw: number | null | undefined): number {
  if (priceKrw == null || !Number.isFinite(priceKrw)) {
    return 0;
  }
  if (priceKrw <= 60_000) {
    return 35;
  }
  if (priceKrw <= 90_000) {
    return 22;
  }
  if (priceKrw <= 130_000) {
    return 10;
  }
  return 0;
}

function scoreTitleBias(input: {
  row: ContextLodgingInventoryRow;
  context?: ContextInstance;
  distanceKm: number | null;
}): { delta: number; reasons: string[] } {
  const title = input.context?.title;
  if (!title) {
    return { delta: 0, reasons: [] };
  }

  const blob = [input.row.name, input.row.partnerLabel, input.row.address]
    .filter(Boolean)
    .join(" ");

  let delta = 0;
  const reasons: string[] = [];

  if (
    title.searchBias.comfortBias === "comfort" &&
    /suite|family|residence|kids|quiet|garden|stay|조용|패밀리|스위트|레지던스/u.test(blob)
  ) {
    delta += 28;
    reasons.push("가족 동선에 편한 숙소예요");
  }

  if (
    title.searchBias.comfortBias === "practical" &&
    /station|terminal|business|quiet|역|터미널|비즈니스|조용/u.test(blob)
  ) {
    delta += 24;
    reasons.push("외근 흐름에 실용적인 숙소예요");
  }

  if (
    title.timeCues.includes("first_day") ||
    title.timeCues.includes("arrival") ||
    title.timeCues.includes("late_night")
  ) {
    if (/station|airport|terminal|check-?in|역|공항|터미널/u.test(blob)) {
      delta += 18;
      reasons.push("첫날 이동 동선에 무리가 적어요");
    }
  }

  if (title.searchBias.proximityBias === "anchor_tight" && input.distanceKm != null) {
    if (input.distanceKm <= 1.5) {
      delta += 16;
      reasons.push("제목이 가리키는 중심 동선에 가까워요");
    } else if (input.distanceKm > 8) {
      delta -= 12;
    }
  }

  return { delta, reasons: reasons.slice(0, 2) };
}

/** Unified context + GPS + price — ranked lodging rows with L1 reason copy. */
export function scoreLodgingRecommendations(input: {
  rows: readonly ContextLodgingInventoryRow[];
  unifiedContext: UnifiedExperienceContext;
  lat?: number | null;
  lng?: number | null;
  context?: ContextInstance;
  event?: EventCandidate | null;
}): ScoredLodgingRecommendation[] {
  const lat = input.lat ?? null;
  const lng = input.lng ?? null;
  const trajectory = input.unifiedContext.behaviorKernel.state.trajectory;
  const travelTrajectory =
    trajectory.dominant_cluster === "travel" && trajectory.strength >= 0.15;
  const budgetBand = findLatestPersonaSignal("travel.budget_band");
  const lodgingPriority = findLatestPersonaSignal("travel.lodging_priority");

  const scored = input.rows.map((row) => {
    let score = 60;
    const peoplePlaceMatch = findPeoplePlaceMatch(row, input.unifiedContext);
    if (peoplePlaceMatch) {
      score += 140;
    }
    if (travelTrajectory) {
      score += 45;
    }
    const { bonus, distanceKm } = scoreDistance(lat, lng, row);
    score += bonus;
    const titleBias = scoreTitleBias({
      row,
      context: input.context,
      distanceKm,
    });
    score += titleBias.delta;
    score += scorePrice(row.priceKrw);
    const businessBias = scoreBusinessTripLodgingBias({
      row,
      event: input.event,
      povLat: lat,
      povLng: lng,
    });
    score += businessBias.delta;
    const lodgingBlob = [row.name, row.partnerLabel].filter(Boolean).join(" ");
    if (budgetBand?.value === "value" && row.priceKrw != null && row.priceKrw <= 120_000) {
      score += 18;
    }
    if (budgetBand?.value === "premium" && row.priceKrw != null && row.priceKrw >= 180_000) {
      score += 10;
    }
    if (lodgingPriority?.value === "station" && /역|station|terminal|난바|우메다/u.test(lodgingBlob)) {
      score += 22;
    }
    if (lodgingPriority?.value === "quiet" && /quiet|garden|stay|forest|조용/u.test(lodgingBlob)) {
      score += 18;
    }
    if (lodgingPriority?.value === "aesthetic" && /design|boutique|view|감성|뷰/u.test(lodgingBlob)) {
      score += 18;
    }
    if (lodgingPriority?.value === "family" && /suite|family|residence|kids/u.test(lodgingBlob)) {
      score += 20;
    }
    if (lodgingPriority?.value === "price" && row.priceKrw != null && row.priceKrw <= 100_000) {
      score += 18;
    }

    const reasonInput: LodgingRecommendReasonInput = {
      peoplePlaceMatch,
      travelTrajectory,
      distanceKm,
      priceKrw: row.priceKrw ?? null,
    };

    const explained = explainLodgingRecommendationKo(reasonInput);
    return {
      row,
      score,
      reasonKo: businessBias.reasons[0] ?? titleBias.reasons[0] ?? explained.reasonKo,
      matchReasons: [...businessBias.reasons, ...titleBias.reasons, ...explained.matchReasons].slice(0, 3),
    };
  });

  scored.sort((left, right) => {
    const delta = right.score - left.score;
    if (delta !== 0) {
      return delta;
    }
    return left.row.name.localeCompare(right.row.name, "ko");
  });

  return scored.map((entry, index) => {
    if (index === 0 && entry.matchReasons.length === 0) {
      const explained = explainLodgingRecommendationKo({
        rankIndex: 0,
        distanceKm: scoreDistance(lat, lng, entry.row).distanceKm,
        priceKrw: entry.row.priceKrw ?? null,
      });
      return { ...entry, reasonKo: explained.reasonKo, matchReasons: explained.matchReasons };
    }
    return entry;
  });
}
