import type { ContextInstance } from "@/lib/context-instance/build-context-instance";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import type {
  LodgingRankDimension,
  LodgingRankProfile,
} from "@/lib/globe/lodging/lodging-rank-profile";
import { weightLodgingRankDimensionScore } from "@/lib/globe/lodging/lodging-rank-profile";
import type {
  TravelBudgetBand,
  TravelLodgingPriority,
} from "@/lib/situation-projection/travel-brain-personalization";

export type LodgingRowDimensionScores = Readonly<
  Record<LodgingRankDimension, number>
>;

const DIMENSIONS: readonly LodgingRankDimension[] = [
  "price",
  "quality",
  "distance",
  "popularity",
];

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** Title / message cues when TravelBrain is unavailable. */
export function inferLodgingPriorityFromContext(
  context?: ContextInstance,
): TravelLodgingPriority | null {
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
  if (
    context.title.companionMode === "parent" ||
    context.title.companionMode === "family" ||
    /엄마|아빠|부모|가족|아이|패밀리|family|parents/u.test(blob)
  ) {
    return "family";
  }
  if (/출장|미팅|business|비즈니스/u.test(blob)) {
    return "station";
  }
  if (/조용|휴식|숙면/u.test(blob)) {
    return "quiet";
  }
  if (/감성|분위기|뷰|신혼|honeymoon/u.test(blob)) {
    return "aesthetic";
  }
  if (/가성비|저렴|budget|싸게/u.test(blob)) {
    return "price";
  }
  if (context.title.searchBias.comfortBias === "practical") {
    return "station";
  }
  if (context.title.searchBias.comfortBias === "comfort") {
    return "family";
  }
  return null;
}

function lodgingBlob(row: ContextLodgingInventoryRow): string {
  return [row.name, row.partnerLabel, row.address].filter(Boolean).join(" ");
}

/** GPS distance → 0..100 (closer is higher). */
export function scoreLodgingDistanceDimension(
  distanceKm: number | null,
): number {
  if (distanceKm == null || !Number.isFinite(distanceKm)) {
    return 50;
  }
  if (distanceKm <= 0.8) {
    return 100;
  }
  if (distanceKm <= 1) {
    return 95;
  }
  if (distanceKm <= 3) {
    return 82;
  }
  if (distanceKm <= 8) {
    return 58;
  }
  if (distanceKm <= 15) {
    return 32;
  }
  return 12;
}

/** Lower nightly rate → higher value score. */
export function scoreLodgingPriceDimension(
  priceKrw: number | null | undefined,
): number {
  if (priceKrw == null || !Number.isFinite(priceKrw)) {
    return 45;
  }
  if (priceKrw <= 60_000) {
    return 94;
  }
  if (priceKrw <= 90_000) {
    return 80;
  }
  if (priceKrw <= 120_000) {
    return 62;
  }
  if (priceKrw <= 180_000) {
    return 40;
  }
  return 18;
}

function scoreLodgingQualityDimension(input: {
  row: ContextLodgingInventoryRow;
  lodgingPriority?: TravelLodgingPriority | null;
  budgetBand?: TravelBudgetBand | null;
  context?: ContextInstance;
  distanceKm: number | null;
}): number {
  const blob = lodgingBlob(input.row);
  let score = 44;

  if (input.lodgingPriority === "quiet" && /quiet|garden|stay|forest|조용/u.test(blob)) {
    score += 34;
  }
  if (input.lodgingPriority === "aesthetic" && /design|boutique|view|감성|뷰/u.test(blob)) {
    score += 34;
  }
  if (input.lodgingPriority === "family" && /suite|family|residence|kids|패밀리|스위트/u.test(blob)) {
    score += 38;
  }
  if (input.lodgingPriority === "station" && /역|station|terminal|난바|우메다/u.test(blob)) {
    score += 18;
  }

  if (input.budgetBand === "premium" && input.row.priceKrw != null && input.row.priceKrw >= 180_000) {
    score += 22;
  }
  if (input.budgetBand === "value" && input.row.priceKrw != null && input.row.priceKrw <= 120_000) {
    score += 8;
  }

  const title = input.context?.title;
  if (title) {
    if (
      title.searchBias.comfortBias === "comfort" &&
      /suite|family|residence|kids|quiet|garden|stay|조용|패밀리|스위트|레지던스/u.test(blob)
    ) {
      score += 32;
    }
    if (
      title.searchBias.comfortBias === "practical" &&
      /station|terminal|business|quiet|역|터미널|비즈니스|조용/u.test(blob)
    ) {
      score += 26;
    }
    if (
      (title.timeCues.includes("first_day") ||
        title.timeCues.includes("arrival") ||
        title.timeCues.includes("late_night")) &&
      /station|airport|terminal|check-?in|역|공항|터미널/u.test(blob)
    ) {
      score += 16;
    }
    if (title.searchBias.proximityBias === "anchor_tight" && input.distanceKm != null) {
      if (input.distanceKm <= 1.5) {
        score += 14;
      } else if (input.distanceKm > 8) {
        score -= 10;
      }
    }
  }

  if (/suite|family|residence|design|boutique|view|스위트|패밀리|감성|뷰/u.test(blob)) {
    score += 6;
  }
  if (/resort|리조트|spa|스파|ocean|오션/u.test(blob)) {
    score += 4;
  }

  return clampScore(score);
}

function scoreLodgingPopularityDimension(row: ContextLodgingInventoryRow): number {
  let score = 42;
  if (row.provider === "liteapi") {
    score += 24;
  }
  if (row.partnerLabel?.trim()) {
    score += 10;
  }
  if (row.images.length >= 2) {
    score += 8;
  }
  return clampScore(score);
}

export function scoreLodgingRowDimensions(input: {
  row: ContextLodgingInventoryRow;
  lat?: number | null;
  lng?: number | null;
  lodgingPriority?: TravelLodgingPriority | null;
  budgetBand?: TravelBudgetBand | null;
  context?: ContextInstance;
}): { dimensions: LodgingRowDimensionScores; distanceKm: number | null } {
  const lat = input.lat ?? null;
  const lng = input.lng ?? null;
  const distanceKm =
    lat != null && lng != null
      ? haversineKm(lat, lng, input.row.lat, input.row.lng)
      : null;

  let distance = scoreLodgingDistanceDimension(distanceKm);
  const blob = lodgingBlob(input.row);
  if (
    input.lodgingPriority === "station" &&
    /역|station|terminal|난바|우메다|서면/u.test(blob)
  ) {
    distance = clampScore(distance + 12);
  }

  let price = scoreLodgingPriceDimension(input.row.priceKrw);
  if (input.lodgingPriority === "price" && input.row.priceKrw != null && input.row.priceKrw <= 100_000) {
    price = clampScore(price + 14);
  }
  if (input.budgetBand === "value" && input.row.priceKrw != null && input.row.priceKrw <= 120_000) {
    price = clampScore(price + 10);
  }

  return {
    distanceKm,
    dimensions: {
      price,
      quality: scoreLodgingQualityDimension({
        row: input.row,
        lodgingPriority: input.lodgingPriority,
        budgetBand: input.budgetBand,
        context: input.context,
        distanceKm,
      }),
      distance,
      popularity: scoreLodgingPopularityDimension(input.row),
    },
  };
}

/** Profile-weighted core rank — each dimension 0..100, weights sum ≈ 1. */
export function computeWeightedLodgingRankScore(
  dimensions: LodgingRowDimensionScores,
  profile: LodgingRankProfile,
): number {
  return Math.round(
    DIMENSIONS.reduce(
      (sum, dimension) =>
        sum + weightLodgingRankDimensionScore(dimension, dimensions[dimension], profile),
      0,
    ),
  );
}
