import type { ContextInstance } from "@/lib/context-instance/build-context-instance";
import type { ContextEateryInventoryRow } from "@/lib/globe/eatery/eatery-resource-types";
import type {
  EateryRankDimension,
  EateryRankProfile,
} from "@/lib/globe/eatery/eatery-rank-profile";
import { weightEateryRankDimensionScore } from "@/lib/globe/eatery/eatery-rank-profile";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import type {
  TravelBudgetBand,
  TravelFoodBias,
  TravelMealTimingPattern,
} from "@/lib/situation-projection/travel-brain-personalization";

export type EateryRowDimensionScores = Readonly<
  Record<EateryRankDimension, number>
>;

const DIMENSIONS: readonly EateryRankDimension[] = [
  "cuisineFit",
  "price",
  "distance",
  "vibe",
];

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function eateryBlob(row: ContextEateryInventoryRow): string {
  return [
    row.name,
    row.address,
    row.categoryLabel,
    row.cuisineHint,
    row.specialReasonKo,
    row.providerLabel,
  ]
    .filter(Boolean)
    .join(" ");
}

/** Title / message cues when TravelBrain is unavailable. */
export function inferFoodBiasFromContext(
  context?: ContextInstance,
): TravelFoodBias | null {
  if (!context) {
    return null;
  }
  const blob = [
    context.input.message,
    context.title.rawTitle,
    context.title.normalizedTitle,
    context.title.primaryPlaceHint?.label,
    context.travel.destinationLabel,
  ]
    .filter(Boolean)
    .join(" ");
  if (/카페|커피|디저트|브런치/u.test(blob) || context.title.searchBias.mealMoment === "breakfast") {
    return "cafe";
  }
  if (
    /야식|심야|이자카야|포차/u.test(blob) ||
    context.title.searchBias.mealMoment === "late_night"
  ) {
    return "late_night";
  }
  if (/로컬|현지|골목|숨은/u.test(blob)) {
    return "local";
  }
  if (/유명|웨이팅|핫플|필수 맛집|관광/u.test(blob)) {
    return "landmark";
  }
  if (/가성비|저렴|싸게|budget/u.test(blob)) {
    return "value";
  }
  return null;
}

/** GPS distance → 0..100 (closer is higher). */
export function scoreEateryDistanceDimension(
  distanceKm: number | null,
): number {
  if (distanceKm == null || !Number.isFinite(distanceKm)) {
    return 50;
  }
  if (distanceKm <= 0.5) {
    return 100;
  }
  if (distanceKm <= 1) {
    return 92;
  }
  if (distanceKm <= 3) {
    return 74;
  }
  if (distanceKm <= 8) {
    return 48;
  }
  if (distanceKm <= 15) {
    return 28;
  }
  return 12;
}

/** Lower priceLevel → higher value score (Google 0–4). */
export function scoreEateryPriceDimension(
  priceLevel: number | null | undefined,
): number {
  if (priceLevel == null || !Number.isFinite(priceLevel)) {
    return 48;
  }
  if (priceLevel <= 1) {
    return 94;
  }
  if (priceLevel === 2) {
    return 72;
  }
  if (priceLevel === 3) {
    return 42;
  }
  return 18;
}

function scoreEateryCuisineFitDimension(input: {
  row: ContextEateryInventoryRow;
  foodBias?: TravelFoodBias | null;
  mealTiming?: TravelMealTimingPattern | null;
  context?: ContextInstance;
}): number {
  const blob = eateryBlob(input.row);
  let score = 42;

  if (input.foodBias === "cafe" && /카페|coffee|dessert|디저트|브런치/u.test(blob)) {
    score += 36;
  }
  if (
    input.foodBias === "late_night" &&
    (input.row.openNow === true || /야식|심야|24시|24시간|술집|포차|우동|라멘/u.test(blob))
  ) {
    score += 38;
  }
  if (input.foodBias === "local" && /로컬|현지|골목/u.test(blob)) {
    score += 28;
  }
  if (input.foodBias === "value" && (input.row.priceLevel ?? 9) <= 2) {
    score += 18;
  }
  if (
    input.foodBias === "landmark" &&
    ((input.row.rating ?? 0) >= 4.4 || /인기|관광|유명|웨이팅/u.test(blob))
  ) {
    score += 22;
  }

  const meal = input.mealTiming ?? input.context?.title.searchBias.mealMoment ?? null;
  if (meal === "late_night") {
    if (input.row.openNow === true || /야식|심야|24시|술집|포차|우동|라멘/u.test(blob)) {
      score += 22;
    }
  } else if (meal === "dinner" && /저녁|고기|이자카야|술집|다이닝|정식/u.test(blob)) {
    score += 16;
  } else if (meal === "lunch" && /점심|국밥|백반|정식|분식|면/u.test(blob)) {
    score += 14;
  } else if (
    (meal === "brunch" || meal === "breakfast") &&
    /조식|아침|브런치|샌드위치|커피|카페/u.test(blob)
  ) {
    score += 18;
  }

  const title = input.context?.title;
  if (title?.searchBias.comfortBias === "comfort") {
    if (
      /가정식|한식|정식|샤브|죽|quiet|조용|룸|family/u.test(blob) ||
      (input.row.rating ?? 0) >= 4.4
    ) {
      score += 16;
    }
  }
  if (title?.searchBias.comfortBias === "practical") {
    if (/조용|quiet|룸|정식|브런치|station|역/u.test(blob)) {
      score += 14;
    }
  }

  if (input.row.cuisineHint?.trim()) {
    score += 6;
  }
  if (input.row.specialScore != null && input.row.specialScore > 8) {
    score += 8;
  }

  return clampScore(score);
}

function scoreEateryVibeDimension(input: {
  row: ContextEateryInventoryRow;
  foodBias?: TravelFoodBias | null;
  budgetBand?: TravelBudgetBand | null;
}): number {
  const blob = eateryBlob(input.row);
  let score = 44;

  const localCue = /로컬|현지|골목|hidden|secret/u.test(blob);
  const landmarkCue =
    (input.row.rating ?? 0) >= 4.4 || /인기|관광|유명|웨이팅|핫플/u.test(blob);

  if (input.foodBias === "local") {
    score += localCue ? 34 : landmarkCue ? -8 : 6;
  } else if (input.foodBias === "landmark") {
    score += landmarkCue ? 34 : localCue ? -6 : 4;
  } else if (input.foodBias === "cafe") {
    score += /카페|coffee|dessert|디저트/u.test(blob) ? 28 : 0;
  } else {
    score += landmarkCue ? 12 : localCue ? 10 : 0;
  }

  if ((input.row.rating ?? 0) >= 4.6) {
    score += 10;
  } else if ((input.row.rating ?? 0) >= 4.2) {
    score += 5;
  }

  if (input.budgetBand === "premium" && (input.row.priceLevel ?? 0) >= 3) {
    score += 12;
  }
  if (input.row.specialReasonKo?.trim()) {
    score += 8;
  }
  if (input.row.images.length >= 2) {
    score += 4;
  }

  return clampScore(score);
}

export function scoreEateryRowDimensions(input: {
  row: ContextEateryInventoryRow;
  lat?: number | null;
  lng?: number | null;
  foodBias?: TravelFoodBias | null;
  mealTiming?: TravelMealTimingPattern | null;
  budgetBand?: TravelBudgetBand | null;
  context?: ContextInstance;
  /** Scale distance when discovery is city-wide (e.g. landmark focus). */
  distanceWeight?: number;
}): { dimensions: EateryRowDimensionScores; distanceKm: number | null } {
  const lat = input.lat ?? null;
  const lng = input.lng ?? null;
  const distanceKm =
    lat != null && lng != null
      ? haversineKm(lat, lng, input.row.lat, input.row.lng)
      : null;

  const distanceWeight = input.distanceWeight ?? 1;
  let distance = scoreEateryDistanceDimension(distanceKm);
  if (distanceWeight < 1) {
    // Pull toward neutral so far exact matches are not buried.
    distance = clampScore(50 + (distance - 50) * distanceWeight);
  }

  const title = input.context?.title;
  if (title?.searchBias.proximityBias === "anchor_tight" && distanceKm != null) {
    if (distanceKm <= 1.2) {
      distance = clampScore(distance + 12);
    } else if (distanceKm > 6) {
      distance = clampScore(distance - 14);
    }
  }

  let price = scoreEateryPriceDimension(input.row.priceLevel);
  if (input.foodBias === "landmark") {
    // Popular/verified mode — price is not the main penalty axis.
    price = clampScore(52 + ((input.row.rating ?? 0) >= 4.4 ? 18 : 0));
  } else if (input.foodBias === "value" && (input.row.priceLevel ?? 9) <= 2) {
    price = clampScore(price + 12);
  }
  if (input.budgetBand === "value" && (input.row.priceLevel ?? 9) <= 2) {
    price = clampScore(price + 10);
  }
  if (input.budgetBand === "premium" && (input.row.priceLevel ?? 0) >= 3) {
    // Premium band: invert value axis slightly — expensive is not a penalty here.
    price = clampScore(100 - scoreEateryPriceDimension(input.row.priceLevel) + 40);
  }

  return {
    distanceKm,
    dimensions: {
      cuisineFit: scoreEateryCuisineFitDimension({
        row: input.row,
        foodBias: input.foodBias,
        mealTiming: input.mealTiming,
        context: input.context,
      }),
      price,
      distance,
      vibe: scoreEateryVibeDimension({
        row: input.row,
        foodBias: input.foodBias,
        budgetBand: input.budgetBand,
      }),
    },
  };
}

/** Profile-weighted core rank — each dimension 0..100, weights sum ≈ 1. */
export function computeWeightedEateryRankScore(
  dimensions: EateryRowDimensionScores,
  profile: EateryRankProfile,
): number {
  return Math.round(
    DIMENSIONS.reduce(
      (sum, dimension) =>
        sum + weightEateryRankDimensionScore(dimension, dimensions[dimension], profile),
      0,
    ),
  );
}
