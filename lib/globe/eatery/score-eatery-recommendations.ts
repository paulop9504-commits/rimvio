import type { ContextInstance } from "@/lib/context-instance/build-context-instance";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import type { UnifiedExperienceContext } from "@/lib/experience-context/unified-experience-context-types";
import type { ContextEateryInventoryRow } from "@/lib/globe/eatery/eatery-resource-types";
import {
  explainEateryRecommendationKo,
  type EateryRecommendReasonInput,
} from "@/lib/globe/eatery/explain-eatery-recommendation-ko";
import type { EateryRankProfile } from "@/lib/globe/eatery/eatery-rank-profile";
import {
  applyEateryRankContextHints,
  DEFAULT_EATERY_RANK_WEIGHTS,
} from "@/lib/globe/eatery/eatery-rank-profile";
import {
  describeEateryRankTravelBrainAxes,
  resolveEateryRankProfileForEvent,
} from "@/lib/globe/eatery/resolve-eatery-rank-profile-from-travel-brain";
import {
  computeWeightedEateryRankScore,
  inferFoodBiasFromContext,
  scoreEateryRowDimensions,
} from "@/lib/globe/eatery/score-eatery-row-dimensions";
import { findLatestPersonaSignal } from "@/lib/persona/persona-inference-store";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import type { ExplorationPolicyKnobs } from "@/lib/globe/discovery-policy/apply-exploration-mode";
import { explorationScoreBias } from "@/lib/globe/discovery-policy/exploration-score-bias";
import type {
  TravelBrainState,
  TravelBudgetBand,
  TravelFoodBias,
  TravelMealTimingPattern,
} from "@/lib/situation-projection/travel-brain-personalization";
import { buildTravelBrainState } from "@/lib/situation-projection/travel-brain-personalization";

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

function titleMatchReasons(input: {
  row: ContextEateryInventoryRow;
  context?: ContextInstance;
  distanceKm: number | null;
}): string[] {
  const title = input.context?.title;
  if (!title) {
    return [];
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

  const reasons: string[] = [];

  if (
    title.searchBias.mealMoment === "late_night" &&
    (input.row.openNow === true || /야식|심야|24시|24시간|술집|포차|우동|라멘/u.test(blob))
  ) {
    reasons.push("제목의 야식 흐름에 맞아요");
  } else if (
    title.searchBias.mealMoment === "dinner" &&
    /저녁|고기|이자카야|술집|다이닝|정식/u.test(blob)
  ) {
    reasons.push("제목의 저녁 흐름과 맞아요");
  } else if (
    title.searchBias.mealMoment === "lunch" &&
    /점심|국밥|백반|정식|분식|면/u.test(blob)
  ) {
    reasons.push("제목의 점심 흐름과 맞아요");
  } else if (
    title.searchBias.mealMoment === "breakfast" &&
    /조식|아침|브런치|샌드위치|커피/u.test(blob)
  ) {
    reasons.push("제목의 아침 흐름과 맞아요");
  }

  if (
    title.searchBias.comfortBias === "comfort" &&
    (/가정식|한식|정식|샤브|죽|quiet|조용|룸|family/u.test(blob) ||
      (input.row.rating ?? 0) >= 4.4)
  ) {
    reasons.push("부모님과 가기 편한 흐름이에요");
  }

  if (
    title.searchBias.comfortBias === "practical" &&
    (/조용|quiet|룸|정식|브런치|station|역/u.test(blob) ||
      (input.distanceKm != null && input.distanceKm <= 1.5))
  ) {
    reasons.push("외근/만남 흐름에 실용적이에요");
  }

  if (title.searchBias.proximityBias === "anchor_tight" && input.distanceKm != null) {
    if (input.distanceKm <= 1.2) {
      reasons.push("제목 동선에서 크게 벗어나지 않아요");
    }
  }

  return reasons.slice(0, 2);
}

/** Strong contextual overlays outside the four profile dimensions. */
function scoreEateryContextualOverlay(input: {
  peoplePlaceMatch: { displayName: string; placeLabel: string } | null;
  travelTrajectory: boolean;
  focusHit: boolean;
  specialScore: number;
  explorationDelta: number;
  genericAgain: boolean;
}): number {
  let overlay = 0;
  if (input.peoplePlaceMatch) {
    overlay += 34;
  }
  if (input.travelTrajectory) {
    overlay += 8;
  }
  if (input.focusHit) {
    overlay += 40;
  }
  if (input.specialScore > 0) {
    overlay += Math.min(12, Math.round(input.specialScore * 0.35));
  }
  overlay += input.explorationDelta;
  if (input.genericAgain) {
    overlay += 4;
  }
  return Math.round(overlay);
}

/** Unified context + GPS + profile — weighted dimension rank with L1 copy. */
export function scoreEateryRecommendations(input: {
  rows: readonly ContextEateryInventoryRow[];
  unifiedContext: UnifiedExperienceContext;
  lat?: number | null;
  lng?: number | null;
  context?: ContextInstance;
  event?: EventCandidate | null;
  travelBrain?: TravelBrainState | null;
  rankProfile?: EateryRankProfile | null;
  /**
   * Scale the proximity bonus. Activity/landmark discovery ("유니버설 스튜디오")
   * is city-wide, so distance must not bury a far but exact match — pass a small
   * weight (e.g. 0.1). Nearby needs (eatery/amenity) keep the default 1.
   */
  distanceWeight?: number;
  /** Boost rows whose name/category matches this focus (e.g. "유니버설 스튜디오"). */
  focusMatch?: string | null;
  exploration?: ExplorationPolicyKnobs;
}): ScoredEateryRecommendation[] {
  const lat = input.lat ?? null;
  const lng = input.lng ?? null;
  const distanceWeight = input.distanceWeight ?? 1;
  const focusTokens = (input.focusMatch ?? "")
    .toLowerCase()
    .split(/[\s·,]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
  const event =
    input.event ??
    (input.context?.eventId
      ? findLifeEventCandidate(input.context.eventId)
      : null);
  const travelBrain =
    input.travelBrain ?? (event ? buildTravelBrainState(event) : null);
  const rankProfile =
    input.rankProfile ??
    (event
      ? resolveEateryRankProfileForEvent({
          event,
          travelBrain,
        })
      : null);
  let profile = rankProfile ?? {
    mode: "auto" as const,
    weights: DEFAULT_EATERY_RANK_WEIGHTS,
    source: "default" as const,
  };
  const brainAxes = travelBrain
    ? describeEateryRankTravelBrainAxes(travelBrain)
    : null;
  const contextFoodBias = inferFoodBiasFromContext(input.context);
  const foodBias: TravelFoodBias | null =
    brainAxes?.foodBias ??
    contextFoodBias ??
    ((findLatestPersonaSignal("travel.food_bias")?.value as
      | TravelFoodBias
      | undefined) ??
      null);
  const dimensionFoodBias: TravelFoodBias | null =
    foodBias ??
    (profile.mode === "popular"
      ? "landmark"
      : profile.mode === "local"
        ? "local"
        : profile.mode === "value"
          ? "value"
          : null);
  const mealTiming: TravelMealTimingPattern | null =
    brainAxes?.mealTiming ??
    (input.context?.title.searchBias.mealMoment as TravelMealTimingPattern | null) ??
    null;
  const budgetBand: TravelBudgetBand | null =
    brainAxes?.budgetBand ??
    ((findLatestPersonaSignal("travel.budget_band")?.value as
      | TravelBudgetBand
      | undefined) ??
      null);
  if (!event && contextFoodBias && profile.mode === "auto") {
    profile = applyEateryRankContextHints(profile, {
      foodBias: contextFoodBias,
      mealTiming,
    });
  }
  const trajectory = input.unifiedContext.behaviorKernel.state.trajectory;
  const travelTrajectory =
    trajectory.dominant_cluster === "travel" && trajectory.strength >= 0.15;
  const genericPreference = findLatestPersonaSignal("generic.preference");

  const scored = input.rows.map((row) => {
    const peoplePlaceMatch = findPeoplePlaceMatch(row, input.unifiedContext);
    const { dimensions, distanceKm } = scoreEateryRowDimensions({
      row,
      lat,
      lng,
      foodBias: dimensionFoodBias,
      mealTiming,
      budgetBand,
      context: input.context,
      distanceWeight,
    });
    const coreScore = computeWeightedEateryRankScore(dimensions, profile);
    const focusBlob = [row.name, row.categoryLabel, row.cuisineHint, row.address]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const focusHit =
      focusTokens.length > 0 &&
      focusTokens.some((token) => focusBlob.includes(token));
    const explorationDelta = input.exploration
      ? explorationScoreBias({
          knobs: input.exploration,
          rating: row.rating,
          labels: [
            row.name,
            row.categoryLabel,
            row.cuisineHint,
            row.specialReasonKo,
            row.providerLabel,
          ],
        })
      : 0;
    const titleReasons = titleMatchReasons({
      row,
      context: input.context,
      distanceKm,
    });
    const overlay = scoreEateryContextualOverlay({
      peoplePlaceMatch,
      travelTrajectory,
      focusHit,
      specialScore:
        row.specialScore != null && Number.isFinite(row.specialScore)
          ? Math.max(0, row.specialScore)
          : 0,
      explorationDelta,
      genericAgain: Boolean(
        genericPreference?.value === "again" && row.specialReasonKo?.trim(),
      ),
    });
    const score = coreScore + overlay;

    const reasonInput: EateryRecommendReasonInput = {
      peoplePlaceMatch,
      travelTrajectory,
      distanceKm,
      cuisineHint: row.cuisineHint ?? null,
    };

    const explained = explainEateryRecommendationKo(reasonInput);
    const matchReasons = [...titleReasons, ...explained.matchReasons];
    if (row.specialReasonKo?.trim()) {
      matchReasons.unshift(row.specialReasonKo.trim());
    }
    if (profile.reasonKo?.trim() && profile.source === "context") {
      matchReasons.push(profile.reasonKo.trim());
    }

    return {
      row,
      score,
      reasonKo:
        row.specialReasonKo?.trim() ||
        titleReasons[0] ||
        profile.reasonKo?.trim() ||
        explained.reasonKo,
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
      const distanceKm =
        lat != null && lng != null
          ? haversineKm(lat, lng, entry.row.lat, entry.row.lng)
          : null;
      const explained = explainEateryRecommendationKo({
        rankIndex: 0,
        distanceKm,
        cuisineHint: entry.row.cuisineHint ?? null,
      });
      return { ...entry, reasonKo: explained.reasonKo, matchReasons: explained.matchReasons };
    }
    return entry;
  });
}
