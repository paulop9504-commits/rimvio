import { haversineKm } from "@/lib/feed/spacetime-fit";
import type { UnifiedExperienceContext } from "@/lib/experience-context/unified-experience-context-types";
import type { ContextEateryInventoryRow } from "@/lib/globe/eatery/eatery-resource-types";
import {
  explainEateryRecommendationKo,
  type EateryRecommendReasonInput,
} from "@/lib/globe/eatery/explain-eatery-recommendation-ko";

export type ScoredEateryRecommendation = {
  row: ContextEateryInventoryRow;
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
  row: ContextEateryInventoryRow,
  unified: UnifiedExperienceContext,
): { displayName: string; placeLabel: string } | null {
  const eateryToken = normalizePlaceToken(row.name);
  if (!eateryToken) {
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
        eateryToken.includes(placeToken) ||
        placeToken.includes(eateryToken) ||
        eateryToken.includes(placeToken.slice(0, Math.min(4, placeToken.length)))
      ) {
        return { displayName: slice.displayName, placeLabel: label };
      }
    }
  }
  return null;
}

function scoreDistance(lat: number | null, lng: number | null, row: ContextEateryInventoryRow): {
  bonus: number;
  distanceKm: number | null;
} {
  if (lat == null || lng == null) {
    return { bonus: 0, distanceKm: null };
  }
  const distanceKm = haversineKm(lat, lng, row.lat, row.lng);
  if (distanceKm <= 0.5) {
    return { bonus: 130, distanceKm };
  }
  if (distanceKm <= 1) {
    return { bonus: 100, distanceKm };
  }
  if (distanceKm <= 3) {
    return { bonus: 60, distanceKm };
  }
  if (distanceKm <= 8) {
    return { bonus: 25, distanceKm };
  }
  return { bonus: 0, distanceKm };
}

/** Unified context + GPS — ranked eatery rows with L1 reason copy. */
export function scoreEateryRecommendations(input: {
  rows: readonly ContextEateryInventoryRow[];
  unifiedContext: UnifiedExperienceContext;
  lat?: number | null;
  lng?: number | null;
}): ScoredEateryRecommendation[] {
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
      score += 35;
    }
    const { bonus, distanceKm } = scoreDistance(lat, lng, row);
    score += bonus;

    const reasonInput: EateryRecommendReasonInput = {
      peoplePlaceMatch,
      travelTrajectory,
      distanceKm,
      cuisineHint: row.cuisineHint ?? null,
    };

    const explained = explainEateryRecommendationKo(reasonInput);
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
      const explained = explainEateryRecommendationKo({
        rankIndex: 0,
        distanceKm: scoreDistance(lat, lng, entry.row).distanceKm,
        cuisineHint: entry.row.cuisineHint ?? null,
      });
      return { ...entry, reasonKo: explained.reasonKo, matchReasons: explained.matchReasons };
    }
    return entry;
  });
}
