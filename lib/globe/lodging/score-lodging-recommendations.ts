import { haversineKm } from "@/lib/feed/spacetime-fit";
import type { UnifiedExperienceContext } from "@/lib/experience-context/unified-experience-context-types";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import {
  explainLodgingRecommendationKo,
  type LodgingRecommendReasonInput,
} from "@/lib/globe/lodging/explain-lodging-recommendation-ko";

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

/** Unified context + GPS + price — ranked lodging rows with L1 reason copy. */
export function scoreLodgingRecommendations(input: {
  rows: readonly ContextLodgingInventoryRow[];
  unifiedContext: UnifiedExperienceContext;
  lat?: number | null;
  lng?: number | null;
}): ScoredLodgingRecommendation[] {
  const lat = input.lat ?? null;
  const lng = input.lng ?? null;
  const trajectory = input.unifiedContext.behaviorKernel.state.trajectory;
  const travelTrajectory =
    trajectory.dominant_cluster === "travel" && trajectory.strength >= 0.15;

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
    score += scorePrice(row.priceKrw);

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
      reasonKo: explained.reasonKo,
      matchReasons: explained.matchReasons,
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
