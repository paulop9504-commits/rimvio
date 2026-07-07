import type { ContextInstance } from "@/lib/context-instance/build-context-instance";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import type { UnifiedExperienceContext } from "@/lib/experience-context/unified-experience-context-types";
import type { ContextEateryInventoryRow } from "@/lib/globe/eatery/eatery-resource-types";
import {
  explainEateryRecommendationKo,
  type EateryRecommendReasonInput,
} from "@/lib/globe/eatery/explain-eatery-recommendation-ko";
import { findLatestPersonaSignal } from "@/lib/persona/persona-inference-store";

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

function scoreTitleBias(input: {
  row: ContextEateryInventoryRow;
  context?: ContextInstance;
  distanceKm: number | null;
}): { delta: number; reasons: string[] } {
  const title = input.context?.title;
  if (!title) {
    return { delta: 0, reasons: [] };
  }

  const blob = [
    input.row.name,
    input.row.address,
    input.row.categoryLabel,
    input.row.cuisineHint,
    input.row.specialReasonKo,
    input.row.providerLabel,
  ]
    .filter(Boolean)
    .join(" ");

  let delta = 0;
  const reasons: string[] = [];

  if (
    title.searchBias.mealMoment === "late_night" &&
    (input.row.openNow === true || /야식|심야|24시|24시간|술집|포차|우동|라멘/u.test(blob))
  ) {
    delta += 30;
    reasons.push("제목의 야식 흐름에 맞아요");
  } else if (
    title.searchBias.mealMoment === "dinner" &&
    /저녁|고기|이자카야|술집|다이닝|정식/u.test(blob)
  ) {
    delta += 16;
    reasons.push("제목의 저녁 흐름과 맞아요");
  } else if (
    title.searchBias.mealMoment === "lunch" &&
    /점심|국밥|백반|정식|분식|면/u.test(blob)
  ) {
    delta += 14;
    reasons.push("제목의 점심 흐름과 맞아요");
  } else if (
    title.searchBias.mealMoment === "breakfast" &&
    /조식|아침|브런치|샌드위치|커피/u.test(blob)
  ) {
    delta += 14;
    reasons.push("제목의 아침 흐름과 맞아요");
  }

  if (
    title.searchBias.comfortBias === "comfort" &&
    (/가정식|한식|정식|샤브|죽|quiet|조용|룸|family/u.test(blob) ||
      (input.row.rating ?? 0) >= 4.4)
  ) {
    delta += 18;
    reasons.push("부모님과 가기 편한 흐름이에요");
  }

  if (
    title.searchBias.comfortBias === "practical" &&
    (/조용|quiet|룸|정식|브런치|station|역/u.test(blob) ||
      (input.distanceKm != null && input.distanceKm <= 1.5))
  ) {
    delta += 16;
    reasons.push("외근/만남 흐름에 실용적이에요");
  }

  if (title.searchBias.proximityBias === "anchor_tight" && input.distanceKm != null) {
    if (input.distanceKm <= 1.2) {
      delta += 18;
      reasons.push("제목 동선에서 크게 벗어나지 않아요");
    } else if (input.distanceKm > 6) {
      delta -= 12;
    }
  }

  return { delta, reasons: reasons.slice(0, 2) };
}

/** Unified context + GPS — ranked eatery rows with L1 reason copy. */
export function scoreEateryRecommendations(input: {
  rows: readonly ContextEateryInventoryRow[];
  unifiedContext: UnifiedExperienceContext;
  lat?: number | null;
  lng?: number | null;
  context?: ContextInstance;
  /**
   * Scale the proximity bonus. Activity/landmark discovery ("유니버설 스튜디오")
   * is city-wide, so distance must not bury a far but exact match — pass a small
   * weight (e.g. 0.1). Nearby needs (eatery/amenity) keep the default 1.
   */
  distanceWeight?: number;
  /** Boost rows whose name/category matches this focus (e.g. "유니버설 스튜디오"). */
  focusMatch?: string | null;
}): ScoredEateryRecommendation[] {
  const lat = input.lat ?? null;
  const lng = input.lng ?? null;
  const distanceWeight = input.distanceWeight ?? 1;
  const focusTokens = (input.focusMatch ?? "")
    .toLowerCase()
    .split(/[\s·,]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
  const trajectory = input.unifiedContext.behaviorKernel.state.trajectory;
  const travelTrajectory =
    trajectory.dominant_cluster === "travel" && trajectory.strength >= 0.15;
  const localityPreference = findLatestPersonaSignal("travel.local_vs_landmark");
  const foodBias = findLatestPersonaSignal("travel.food_bias");
  const genericPreference = findLatestPersonaSignal("generic.preference");

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
    score += bonus * distanceWeight;
    if (focusTokens.length > 0) {
      const focusBlob = [row.name, row.categoryLabel, row.cuisineHint, row.address]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (focusTokens.some((token) => focusBlob.includes(token))) {
        score += 200;
      }
    }
    const titleBias = scoreTitleBias({
      row,
      context: input.context,
      distanceKm,
    });
    score += titleBias.delta;
    if (row.specialScore != null && Number.isFinite(row.specialScore)) {
      score += Math.max(0, row.specialScore);
    }
    const localityBlob = [
      row.specialReasonKo,
      row.categoryLabel,
      row.cuisineHint,
      row.providerLabel,
    ]
      .filter(Boolean)
      .join(" ");
    if (localityPreference?.value === "local" && /로컬|현지|골목/u.test(localityBlob)) {
      score += 18;
    }
    if (foodBias?.value === "local" && /로컬|현지|골목/u.test(localityBlob)) {
      score += 22;
    }
    if (
      localityPreference?.value === "landmark" &&
      ((row.rating ?? 0) >= 4.4 || /인기|관광|유명/u.test(localityBlob))
    ) {
      score += 14;
    }
    if (
      foodBias?.value === "landmark" &&
      ((row.rating ?? 0) >= 4.4 || /인기|관광|유명/u.test(localityBlob))
    ) {
      score += 18;
    }
    if (foodBias?.value === "cafe" && /카페|coffee|dessert|디저트/u.test(localityBlob)) {
      score += 20;
    }
    if (foodBias?.value === "late_night" && (row.openNow === true || /야식|심야/u.test(localityBlob))) {
      score += 18;
    }
    if (foodBias?.value === "value" && (row.priceLevel ?? 9) <= 2) {
      score += 16;
    }
    if (genericPreference?.value === "again" && row.specialReasonKo?.trim()) {
      score += 10;
    }

    const reasonInput: EateryRecommendReasonInput = {
      peoplePlaceMatch,
      travelTrajectory,
      distanceKm,
      cuisineHint: row.cuisineHint ?? null,
    };

    const explained = explainEateryRecommendationKo(reasonInput);
    const matchReasons = [...titleBias.reasons, ...explained.matchReasons];
    if (row.specialReasonKo?.trim()) {
      matchReasons.unshift(row.specialReasonKo.trim());
    }
    return {
      row,
      score,
      reasonKo: row.specialReasonKo?.trim() || titleBias.reasons[0] || explained.reasonKo,
      matchReasons: matchReasons.slice(0, 3),
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
