import type {
  TravelBudgetBand,
  TravelCompanionMode,
  TravelFoodBias,
  TravelMealTimingPattern,
} from "@/lib/situation-projection/travel-brain-personalization";

/** Ranking axes — cold-start default + TravelBrain merge SSOT. */
export type EateryRankDimension =
  | "cuisineFit"
  | "price"
  | "distance"
  | "vibe";

export type EateryRankWeights = Readonly<Record<EateryRankDimension, number>>;

/** UI / resolver mode — `auto` is the product default. */
export type EateryRankMode =
  | "auto"
  | "local"
  | "value"
  | "distance"
  | "popular";

export type EateryRankProfileSource =
  | "default"
  | "preset"
  | "context"
  | "learned"
  | "manual";

/** Declarative weight vector + trace metadata (L2/L3 — not hero copy). */
export type EateryRankProfile = {
  readonly mode: EateryRankMode;
  readonly weights: EateryRankWeights;
  readonly source: EateryRankProfileSource;
  /** Internal trace for projection / debug — optional L1 chip subtitle later. */
  readonly reasonKo?: string | null;
};

/** Cold-start vector when user says nothing — taste first, then value/distance. */
export const DEFAULT_EATERY_RANK_WEIGHTS: EateryRankWeights = {
  cuisineFit: 0.32,
  price: 0.24,
  distance: 0.22,
  vibe: 0.22,
} as const;

export const DEFAULT_EATERY_RANK_PROFILE: EateryRankProfile = {
  mode: "auto",
  weights: DEFAULT_EATERY_RANK_WEIGHTS,
  source: "default",
  reasonKo: "기본 맞춤 가중치",
} as const;

/** Manual chip overrides — `auto` uses default + context merge, not this table alone. */
export const EATERY_RANK_MODE_PRESETS: Readonly<
  Record<Exclude<EateryRankMode, "auto">, EateryRankProfile>
> = {
  local: {
    mode: "local",
    weights: { cuisineFit: 0.28, price: 0.18, distance: 0.18, vibe: 0.36 },
    source: "preset",
    reasonKo: "로컬·골목 우선",
  },
  value: {
    mode: "value",
    weights: { cuisineFit: 0.22, price: 0.45, distance: 0.2, vibe: 0.13 },
    source: "preset",
    reasonKo: "가성비 우선",
  },
  distance: {
    mode: "distance",
    weights: { cuisineFit: 0.2, price: 0.15, distance: 0.5, vibe: 0.15 },
    source: "preset",
    reasonKo: "거리·동선 우선",
  },
  popular: {
    mode: "popular",
    weights: { cuisineFit: 0.22, price: 0.15, distance: 0.18, vibe: 0.45 },
    source: "preset",
    reasonKo: "검증·인기 우선",
  },
} as const;

/** Per-axis clamp before renormalize — learning drift stays inside these rails. */
export const EATERY_RANK_WEIGHT_BOUNDS: Readonly<
  Record<EateryRankDimension, { readonly min: number; readonly max: number }>
> = {
  cuisineFit: { min: 0.12, max: 0.55 },
  price: { min: 0.1, max: 0.55 },
  distance: { min: 0.08, max: 0.55 },
  vibe: { min: 0.1, max: 0.5 },
} as const;

export type EateryRankContextHints = {
  foodBias?: TravelFoodBias | null;
  mealTiming?: TravelMealTimingPattern | null;
  budgetBand?: TravelBudgetBand | null;
  companionMode?: TravelCompanionMode | null;
  /** Fast-scroll rejects in feed — nudge away from shown cluster. */
  rejectSignalCount?: number;
};

const DIMENSIONS: readonly EateryRankDimension[] = [
  "cuisineFit",
  "price",
  "distance",
  "vibe",
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Clamp each axis then renormalize to sum ≈ 1. */
export function normalizeEateryRankWeights(
  weights: EateryRankWeights,
): EateryRankWeights {
  const clamped = Object.fromEntries(
    DIMENSIONS.map((key) => [
      key,
      clamp(
        weights[key],
        EATERY_RANK_WEIGHT_BOUNDS[key].min,
        EATERY_RANK_WEIGHT_BOUNDS[key].max,
      ),
    ]),
  ) as Record<EateryRankDimension, number>;

  const sum = DIMENSIONS.reduce((total, key) => total + clamped[key], 0);
  if (sum <= 0) {
    return { ...DEFAULT_EATERY_RANK_WEIGHTS };
  }
  return Object.fromEntries(
    DIMENSIONS.map((key) => [key, clamped[key] / sum]),
  ) as EateryRankWeights;
}

/** Weighted blend — `amount` 0..1 toward `right`. */
export function blendEateryRankWeights(
  left: EateryRankWeights,
  right: EateryRankWeights,
  amount: number,
): EateryRankWeights {
  const t = clamp(amount, 0, 1);
  return normalizeEateryRankWeights(
    Object.fromEntries(
      DIMENSIONS.map((key) => [
        key,
        left[key] * (1 - t) + right[key] * t,
      ]),
    ) as EateryRankWeights,
  );
}

export function resolveEateryRankPreset(mode: EateryRankMode): EateryRankProfile {
  if (mode === "auto") {
    return DEFAULT_EATERY_RANK_PROFILE;
  }
  return EATERY_RANK_MODE_PRESETS[mode];
}

/** TravelBrain + companion hints → context-adjusted profile (deterministic). */
export function applyEateryRankContextHints(
  base: EateryRankProfile,
  hints: EateryRankContextHints,
): EateryRankProfile {
  let weights = { ...base.weights };
  const reasons: string[] = [];

  switch (hints.foodBias) {
    case "local":
      weights = blendEateryRankWeights(weights, EATERY_RANK_MODE_PRESETS.local.weights, 0.45);
      reasons.push("현지 맛");
      break;
    case "landmark":
      weights = blendEateryRankWeights(weights, EATERY_RANK_MODE_PRESETS.popular.weights, 0.4);
      reasons.push("검증된 곳");
      break;
    case "cafe":
      weights = blendEateryRankWeights(weights, EATERY_RANK_MODE_PRESETS.local.weights, 0.25);
      weights = blendEateryRankWeights(
        weights,
        { cuisineFit: 0.5, price: 0.15, distance: 0.2, vibe: 0.15 },
        0.35,
      );
      reasons.push("카페 리듬");
      break;
    case "late_night":
      weights = blendEateryRankWeights(weights, EATERY_RANK_MODE_PRESETS.distance.weights, 0.3);
      weights = blendEateryRankWeights(
        weights,
        { cuisineFit: 0.4, price: 0.15, distance: 0.25, vibe: 0.2 },
        0.3,
      );
      reasons.push("야식 동선");
      break;
    case "value":
      weights = blendEateryRankWeights(weights, EATERY_RANK_MODE_PRESETS.value.weights, 0.4);
      reasons.push("가성비 식사");
      break;
    default:
      break;
  }

  if (hints.mealTiming === "late_night") {
    weights = blendEateryRankWeights(weights, EATERY_RANK_MODE_PRESETS.distance.weights, 0.2);
    reasons.push("야식 시간");
  } else if (hints.mealTiming === "brunch") {
    weights = blendEateryRankWeights(
      weights,
      { cuisineFit: 0.45, price: 0.15, distance: 0.2, vibe: 0.2 },
      0.25,
    );
    reasons.push("브런치 리듬");
  } else if (hints.mealTiming === "lunch") {
    weights = blendEateryRankWeights(weights, EATERY_RANK_MODE_PRESETS.distance.weights, 0.15);
    reasons.push("점심 동선");
  }

  if (hints.companionMode === "parents" || hints.companionMode === "family") {
    weights = blendEateryRankWeights(weights, EATERY_RANK_MODE_PRESETS.popular.weights, 0.28);
    reasons.push("가족 동행");
  } else if (hints.companionMode === "couple") {
    weights = blendEateryRankWeights(weights, EATERY_RANK_MODE_PRESETS.popular.weights, 0.28);
    weights = blendEateryRankWeights(
      weights,
      { cuisineFit: 0.35, price: 0.15, distance: 0.15, vibe: 0.35 },
      0.4,
    );
    reasons.push("둘만의 분위기");
  } else if (hints.companionMode === "friends") {
    weights = blendEateryRankWeights(weights, EATERY_RANK_MODE_PRESETS.local.weights, 0.3);
    reasons.push("친구 동행");
  } else if (hints.companionMode === "solo") {
    weights = blendEateryRankWeights(weights, EATERY_RANK_MODE_PRESETS.local.weights, 0.15);
    reasons.push("혼자 식사");
  }

  if (hints.budgetBand === "value") {
    weights = blendEateryRankWeights(weights, EATERY_RANK_MODE_PRESETS.value.weights, 0.35);
    reasons.push("가성비 밴드");
  } else if (hints.budgetBand === "premium") {
    weights = blendEateryRankWeights(weights, EATERY_RANK_MODE_PRESETS.popular.weights, 0.3);
    reasons.push("프리미엄 밴드");
  }

  const rejects = hints.rejectSignalCount ?? 0;
  if (rejects >= 3) {
    weights = blendEateryRankWeights(weights, EATERY_RANK_MODE_PRESETS.local.weights, 0.25);
    reasons.push("피드에서 다른 후보 탐색");
  }

  if (reasons.length === 0) {
    return base;
  }

  return {
    mode: base.mode,
    weights: normalizeEateryRankWeights(weights),
    source: "context",
    reasonKo: reasons.slice(0, 2).join(" · "),
  };
}

/** Resolve final profile: preset chip or auto default + context hints. */
export function resolveEateryRankProfile(input: {
  mode?: EateryRankMode | null;
  hints?: EateryRankContextHints | null;
}): EateryRankProfile {
  const mode = input.mode ?? "auto";
  const base = resolveEateryRankPreset(mode);
  if (mode !== "auto") {
    return base;
  }
  return applyEateryRankContextHints(base, input.hints ?? {});
}

/** Scale a 0..100 dimension score by profile weight (for weighted rank sum). */
export function weightEateryRankDimensionScore(
  dimension: EateryRankDimension,
  score100: number,
  profile: EateryRankProfile,
): number {
  const safe = Number.isFinite(score100) ? clamp(score100, 0, 100) : 0;
  return safe * profile.weights[dimension];
}
