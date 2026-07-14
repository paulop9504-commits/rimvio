import type {
  TravelBudgetBand,
  TravelCompanionMode,
  TravelLodgingPriority,
} from "@/lib/situation-projection/travel-brain-personalization";

/** Ranking axes — cold-start default + context merge SSOT. */
export type LodgingRankDimension =
  | "price"
  | "quality"
  | "distance"
  | "popularity";

export type LodgingRankWeights = Readonly<Record<LodgingRankDimension, number>>;

/** UI / resolver mode — `auto` is the product default. */
export type LodgingRankMode =
  | "auto"
  | "value"
  | "distance"
  | "popular"
  | "premium";

export type LodgingRankProfileSource =
  | "default"
  | "preset"
  | "context"
  | "learned"
  | "manual";

/** Declarative weight vector + trace metadata (L2/L3 — not hero copy). */
export type LodgingRankProfile = {
  readonly mode: LodgingRankMode;
  readonly weights: LodgingRankWeights;
  readonly source: LodgingRankProfileSource;
  /** Internal trace for projection / debug — optional L1 chip subtitle later. */
  readonly reasonKo?: string | null;
};

/** Cold-start — balanced value (cheap dump loses to good mid-tier near hub). */
export const DEFAULT_LODGING_RANK_WEIGHTS: LodgingRankWeights = {
  price: 0.28,
  quality: 0.36,
  distance: 0.24,
  popularity: 0.12,
} as const;

export const DEFAULT_LODGING_RANK_PROFILE: LodgingRankProfile = {
  mode: "auto",
  weights: DEFAULT_LODGING_RANK_WEIGHTS,
  source: "default",
  reasonKo: "기본 맞춤 가중치",
} as const;

/** Manual chip overrides — `auto` uses default + context merge, not this table alone. */
export const LODGING_RANK_MODE_PRESETS: Readonly<
  Record<Exclude<LodgingRankMode, "auto">, LodgingRankProfile>
> = {
  value: {
    mode: "value",
    // True 가성비 = not cheapest dump — quality + location must stay first-class.
    weights: { price: 0.28, quality: 0.34, distance: 0.26, popularity: 0.12 },
    source: "preset",
    reasonKo: "값 대비 품질·위치",
  },
  distance: {
    mode: "distance",
    weights: { price: 0.15, quality: 0.2, distance: 0.5, popularity: 0.15 },
    source: "preset",
    reasonKo: "거리·동선 우선",
  },
  popular: {
    mode: "popular",
    weights: { price: 0.2, quality: 0.25, distance: 0.15, popularity: 0.4 },
    source: "preset",
    reasonKo: "인기·후기 우선",
  },
  premium: {
    mode: "premium",
    weights: { price: 0.1, quality: 0.55, distance: 0.15, popularity: 0.2 },
    source: "preset",
    reasonKo: "프리미엄·품질 우선",
  },
} as const;

/** Per-axis clamp before renormalize — learning drift stays inside these rails. */
export const LODGING_RANK_WEIGHT_BOUNDS: Readonly<
  Record<LodgingRankDimension, { readonly min: number; readonly max: number }>
> = {
  price: { min: 0.1, max: 0.6 },
  quality: { min: 0.1, max: 0.65 },
  distance: { min: 0.05, max: 0.55 },
  popularity: { min: 0.05, max: 0.45 },
} as const;

export type LodgingRankContextHints = {
  lodgingPriority?: TravelLodgingPriority | null;
  budgetBand?: TravelBudgetBand | null;
  companionMode?: TravelCompanionMode | null;
  /** Fast-scroll rejects in feed — nudge away from shown cluster. */
  rejectSignalCount?: number;
};

const DIMENSIONS: readonly LodgingRankDimension[] = [
  "price",
  "quality",
  "distance",
  "popularity",
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Clamp each axis then renormalize to sum ≈ 1. */
export function normalizeLodgingRankWeights(
  weights: LodgingRankWeights,
): LodgingRankWeights {
  const clamped = Object.fromEntries(
    DIMENSIONS.map((key) => [
      key,
      clamp(
        weights[key],
        LODGING_RANK_WEIGHT_BOUNDS[key].min,
        LODGING_RANK_WEIGHT_BOUNDS[key].max,
      ),
    ]),
  ) as Record<LodgingRankDimension, number>;

  const sum = DIMENSIONS.reduce((total, key) => total + clamped[key], 0);
  if (sum <= 0) {
    return { ...DEFAULT_LODGING_RANK_WEIGHTS };
  }
  return Object.fromEntries(
    DIMENSIONS.map((key) => [key, clamped[key] / sum]),
  ) as LodgingRankWeights;
}

/** Weighted blend — `amount` 0..1 toward `right`. */
export function blendLodgingRankWeights(
  left: LodgingRankWeights,
  right: LodgingRankWeights,
  amount: number,
): LodgingRankWeights {
  const t = clamp(amount, 0, 1);
  return normalizeLodgingRankWeights(
    Object.fromEntries(
      DIMENSIONS.map((key) => [
        key,
        left[key] * (1 - t) + right[key] * t,
      ]),
    ) as LodgingRankWeights,
  );
}

export function resolveLodgingRankPreset(
  mode: LodgingRankMode,
): LodgingRankProfile {
  if (mode === "auto") {
    return DEFAULT_LODGING_RANK_PROFILE;
  }
  return LODGING_RANK_MODE_PRESETS[mode];
}

/** TravelBrain + companion hints → context-adjusted profile (deterministic). */
export function applyLodgingRankContextHints(
  base: LodgingRankProfile,
  hints: LodgingRankContextHints,
): LodgingRankProfile {
  let weights = { ...base.weights };
  const reasons: string[] = [];

  switch (hints.lodgingPriority) {
    case "station":
      weights = blendLodgingRankWeights(weights, LODGING_RANK_MODE_PRESETS.distance.weights, 0.45);
      reasons.push("역·터미널 동선");
      break;
    case "price":
      weights = blendLodgingRankWeights(weights, LODGING_RANK_MODE_PRESETS.value.weights, 0.55);
      reasons.push("값 대비 품질");
      break;
    case "aesthetic":
      weights = blendLodgingRankWeights(weights, LODGING_RANK_MODE_PRESETS.premium.weights, 0.35);
      reasons.push("분위기·뷰");
      break;
    case "quiet":
      weights = blendLodgingRankWeights(weights, LODGING_RANK_MODE_PRESETS.premium.weights, 0.25);
      reasons.push("조용함·휴식");
      break;
    case "family":
      weights = blendLodgingRankWeights(weights, LODGING_RANK_MODE_PRESETS.premium.weights, 0.3);
      weights = blendLodgingRankWeights(weights, LODGING_RANK_MODE_PRESETS.distance.weights, 0.15);
      reasons.push("동행 편의");
      break;
    default:
      break;
  }

  if (hints.companionMode === "parents" || hints.companionMode === "family") {
    weights = blendLodgingRankWeights(weights, LODGING_RANK_MODE_PRESETS.premium.weights, 0.25);
    reasons.push("가족 동행");
  } else if (hints.companionMode === "couple") {
    weights = blendLodgingRankWeights(weights, LODGING_RANK_MODE_PRESETS.premium.weights, 0.2);
    reasons.push("둘만의 여행");
  }

  if (hints.budgetBand === "value") {
    weights = blendLodgingRankWeights(weights, LODGING_RANK_MODE_PRESETS.value.weights, 0.35);
    reasons.push("가성비 밴드");
  } else if (hints.budgetBand === "premium") {
    weights = blendLodgingRankWeights(weights, LODGING_RANK_MODE_PRESETS.premium.weights, 0.35);
    reasons.push("프리미엄 밴드");
  }

  const rejects = hints.rejectSignalCount ?? 0;
  if (rejects >= 3) {
    weights = blendLodgingRankWeights(weights, LODGING_RANK_MODE_PRESETS.popular.weights, 0.2);
    reasons.push("피드에서 다른 후보 탐색");
  }

  if (reasons.length === 0) {
    return base;
  }

  return {
    mode: base.mode,
    weights: normalizeLodgingRankWeights(weights),
    source: "context",
    reasonKo: reasons.slice(0, 2).join(" · "),
  };
}

/** Resolve final profile: preset chip or auto default + context hints. */
export function resolveLodgingRankProfile(input: {
  mode?: LodgingRankMode | null;
  hints?: LodgingRankContextHints | null;
}): LodgingRankProfile {
  const mode = input.mode ?? "auto";
  const base = resolveLodgingRankPreset(mode);
  if (mode !== "auto") {
    return base;
  }
  return applyLodgingRankContextHints(base, input.hints ?? {});
}

/** Scale a 0..100 dimension score by profile weight (for weighted rank sum). */
export function weightLodgingRankDimensionScore(
  dimension: LodgingRankDimension,
  score100: number,
  profile: LodgingRankProfile,
): number {
  const safe = Number.isFinite(score100) ? clamp(score100, 0, 100) : 0;
  return safe * profile.weights[dimension];
}
