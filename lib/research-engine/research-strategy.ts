/**
 * Research surgical strategy lenses — switch method when evidence is weak.
 * Cursor-like: failure → change approach (budget / distance / review first).
 */

import type { RankedCandidate } from "@/engines/research/schema";
import type { ResearchToolGap, ResearchToolCall } from "@/lib/research-engine/tools/types";
import type { PersuasionAxisId } from "@/lib/research-engine/score-persuasion";
import { scoreResearchPersuasion } from "@/lib/research-engine/score-persuasion";
import type { PersuasionContext } from "@/lib/research-engine/score-persuasion";
import type { ResearchMissingField } from "@/lib/research-engine/tools/detect-research-missing-fields";
import { detectResearchMissingFields } from "@/lib/research-engine/tools/detect-research-missing-fields";

export type ResearchStrategyId =
  | "balanced"
  | "budget_first"
  | "distance_first"
  | "review_first";

export type ResearchStrategyStep = {
  readonly strategy: ResearchStrategyId;
  readonly reasonKo: string;
  /** true = switched after weak evidence (not the opening lens). */
  readonly switched?: boolean;
};

const AXIS_ORDER: Record<ResearchStrategyId, readonly PersuasionAxisId[]> = {
  balanced: ["observation", "priceFit", "distance", "crossCheck", "context"],
  budget_first: ["priceFit", "observation", "distance", "crossCheck", "context"],
  distance_first: ["distance", "observation", "priceFit", "crossCheck", "context"],
  review_first: ["observation", "crossCheck", "priceFit", "distance", "context"],
};

const ALL_LENSES: readonly ResearchStrategyId[] = [
  "review_first",
  "budget_first",
  "distance_first",
  "balanced",
];

/** Default confidence below which we change surgical mode. */
export const RESEARCH_STRATEGY_SWITCH_CONFIDENCE = 0.5;

/** Max lens switches after the opening pass (total passes = 1 + this). */
export const RESEARCH_STRATEGY_MAX_SWITCHES = 2;

export function researchStrategyLabelKo(strategy: ResearchStrategyId): string {
  switch (strategy) {
    case "budget_first":
      return "예산 우선";
    case "distance_first":
      return "동선 우선";
    case "review_first":
      return "리뷰 우선";
    default:
      return "균형";
  }
}

/** Infer starting lens from utterance cues. */
export function resolveInitialResearchStrategy(input: {
  message: string;
  maxNightlyPriceKrw?: number | null;
  hasAnchor?: boolean;
}): ResearchStrategyId {
  const text = input.message.trim();
  if (!text) {
    return "balanced";
  }
  if (
    input.maxNightlyPriceKrw != null ||
    /(?:만원|예산|가성비|싸|저렴|저가|cheap|budget|10만|3만)/iu.test(text)
  ) {
    return "budget_first";
  }
  if (
    input.hasAnchor &&
    /(?:가깝|근처|주변|도보|역|거리|동선|nearby|walk)/iu.test(text)
  ) {
    return "distance_first";
  }
  if (/(?:리뷰|평점|후기|별점|인기|rating|review)/iu.test(text)) {
    return "review_first";
  }
  return "balanced";
}

function weakestAxisId(
  ranked: readonly RankedCandidate[],
  persuasionContext: PersuasionContext,
): PersuasionAxisId | null {
  const persuasion = scoreResearchPersuasion(ranked, persuasionContext);
  const critical: PersuasionAxisId[] = [
    "observation",
    "priceFit",
    "distance",
    "crossCheck",
  ];
  let worst: PersuasionAxisId | null = null;
  let worstScore = 2;
  for (const id of critical) {
    const axis = persuasion.axes.find((a) => a.id === id);
    const score = !axis || !axis.available ? -0.01 : axis.score;
    if (score < worstScore) {
      worstScore = score;
      worst = id;
    }
  }
  return worst;
}

function lensForWeakAxis(
  axis: PersuasionAxisId | null,
  hasAnchor: boolean,
): ResearchStrategyId {
  switch (axis) {
    case "priceFit":
      return "budget_first";
    case "distance":
      return hasAnchor ? "distance_first" : "review_first";
    case "observation":
    case "crossCheck":
      return "review_first";
    default:
      return "review_first";
  }
}

function lensForMissingField(
  field: ResearchMissingField,
  hasAnchor: boolean,
): ResearchStrategyId {
  switch (field) {
    case "priceKrw":
      return "budget_first";
    case "distanceKm":
    case "coords":
      return hasAnchor ? "distance_first" : "review_first";
    case "reviewCount":
    case "rating":
    case "youtubeConfidence":
      return "review_first";
    default:
      return "review_first";
  }
}

export type ShouldSwitchResearchStrategyInput = {
  readonly confidence: number;
  readonly ranked: readonly RankedCandidate[];
  readonly persuasionContext: PersuasionContext;
  readonly toolTrace?: readonly ResearchToolCall[];
  /** Already applied switches (not counting opening lens). */
  readonly switchCount: number;
  readonly maxSwitches?: number;
};

/** True when evidence is still weak enough to change surgical mode. */
export function shouldSwitchResearchStrategy(
  input: ShouldSwitchResearchStrategyInput,
): boolean {
  const max = input.maxSwitches ?? RESEARCH_STRATEGY_MAX_SWITCHES;
  if (input.switchCount >= max) {
    return false;
  }

  const missing = detectResearchMissingFields({
    ranked: input.ranked,
    persuasionContext: input.persuasionContext,
  });
  const criticalMissing = missing.filter((m) =>
    ["reviewCount", "priceKrw", "distanceKm", "youtubeConfidence"].includes(
      m.field,
    ),
  );

  const tools = input.toolTrace ?? [];
  const okTools = tools.filter((t) => t.status === "ok").length;
  const skipHeavy =
    tools.length >= 2 && okTools / Math.max(1, tools.length) < 0.35;

  const persuasion = scoreResearchPersuasion(
    input.ranked,
    input.persuasionContext,
  );
  const strongAxes = persuasion.axes.filter(
    (a) => a.available && a.score >= 0.4,
  ).length;

  if (input.confidence < RESEARCH_STRATEGY_SWITCH_CONFIDENCE) {
    return true;
  }
  if (criticalMissing.length >= 2) {
    return true;
  }
  if (skipHeavy && criticalMissing.length >= 1) {
    return true;
  }
  if (strongAxes < 2 && input.confidence < 0.62) {
    return true;
  }
  return false;
}

/**
 * Pick next surgical lens from remaining weak evidence.
 * Never repeats a tried strategy.
 */
export function resolveNextResearchStrategy(input: {
  current: ResearchStrategyId;
  message: string;
  maxNightlyPriceKrw?: number | null;
  hasAnchor?: boolean;
  confidence: number;
  ranked?: readonly RankedCandidate[];
  persuasionContext?: PersuasionContext;
  toolTrace?: readonly ResearchToolCall[];
  triedStrategies?: ReadonlySet<ResearchStrategyId>;
  switchCount?: number;
  maxSwitches?: number;
}): ResearchStrategyStep | null {
  const tried = new Set<ResearchStrategyId>([
    ...(input.triedStrategies ?? []),
    input.current,
  ]);
  const switchCount = input.switchCount ?? tried.size - 1;
  const ranked = input.ranked ?? [];
  const persuasionContext: PersuasionContext = input.persuasionContext ?? {
    message: input.message,
    maxNightlyPriceKrw: input.maxNightlyPriceKrw ?? null,
    anchorLat: null,
    anchorLng: null,
  };

  if (
    !shouldSwitchResearchStrategy({
      confidence: input.confidence,
      ranked,
      persuasionContext,
      toolTrace: input.toolTrace,
      switchCount,
      maxSwitches: input.maxSwitches,
    })
  ) {
    // Legacy test path: confidence-only gate when no ranked given.
    if (
      ranked.length === 0 &&
      input.confidence < RESEARCH_STRATEGY_SWITCH_CONFIDENCE
    ) {
      // fall through to sequence pick
    } else if (ranked.length === 0 && input.confidence >= 0.45) {
      return null;
    } else if (ranked.length > 0) {
      return null;
    }
  }

  const hasAnchor = Boolean(input.hasAnchor);
  const missing = ranked.length
    ? detectResearchMissingFields({ ranked, persuasionContext })
    : [];
  const preferredFromGap = missing[0]
    ? lensForMissingField(missing[0].field, hasAnchor)
    : lensForWeakAxis(weakestAxisId(ranked, persuasionContext), hasAnchor);

  const cuePreferred = resolveInitialResearchStrategy({
    message: input.message,
    maxNightlyPriceKrw: input.maxNightlyPriceKrw,
    hasAnchor,
  });

  const candidates: ResearchStrategyId[] = [
    preferredFromGap,
    cuePreferred,
    ...ALL_LENSES,
  ];
  const next = candidates.find((s) => !tried.has(s));
  if (!next) {
    return null;
  }

  const weakHint =
    missing[0]?.missingKey ??
    (weakestAxisId(ranked, persuasionContext)
      ? `weak:${weakestAxisId(ranked, persuasionContext)}`
      : `conf=${input.confidence.toFixed(2)}`);

  return {
    strategy: next,
    switched: true,
    reasonKo: `증거 부족(${weakHint}) → 「${researchStrategyLabelKo(next)}」 렌즈로 전환 · 후보 재추출`,
  };
}

/** Reorder gaps so strategy-preferred axes are attempted first. */
export function reorderGapsForStrategy(
  gaps: readonly ResearchToolGap[],
  strategy: ResearchStrategyId,
): ResearchToolGap[] {
  const order = AXIS_ORDER[strategy];
  const rank = new Map(order.map((id, index) => [id, index]));
  return [...gaps].sort((a, b) => {
    const ra = rank.get(a.axisId) ?? 99;
    const rb = rank.get(b.axisId) ?? 99;
    return ra - rb;
  });
}

function readMeta(
  row: RankedCandidate,
  key: string,
): number | null {
  const v = row.candidate.metadata?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Soft re-order kept candidates for the active lens (rejected stay put). */
export function reorderRankedForStrategy(input: {
  ranked: readonly RankedCandidate[];
  strategy: ResearchStrategyId;
  maxNightlyPriceKrw?: number | null;
  anchorLat?: number | null;
  anchorLng?: number | null;
}): RankedCandidate[] {
  const kept = input.ranked.filter((r) => !r.rejected);
  const rejected = input.ranked.filter((r) => r.rejected);
  if (kept.length <= 1) {
    return [...input.ranked];
  }

  const scored = kept.map((row, index) => {
    let lens = 0;
    const price = readMeta(row, "priceKrw");
    const reviews = row.candidate.reviewCount ?? 0;
    const distKm = readMeta(row, "distanceKm");
    switch (input.strategy) {
      case "budget_first": {
        if (price != null && price > 0) {
          const cap = input.maxNightlyPriceKrw ?? price;
          const ratio = price / Math.max(1, cap);
          lens = ratio <= 1 ? 1 - ratio * 0.3 : Math.max(0, 1.2 - ratio);
        }
        break;
      }
      case "distance_first": {
        if (distKm != null) {
          lens = Math.max(0, 1 - distKm / 8);
        } else if (
          readMeta(row, "lat") != null &&
          input.anchorLat != null
        ) {
          lens = 0.5;
        }
        break;
      }
      case "review_first": {
        lens =
          reviews >= 200
            ? 1
            : reviews >= 80
              ? 0.85
              : reviews >= 20
                ? 0.65
                : reviews > 0
                  ? 0.4
                  : 0.1;
        const pop = row.candidate.popularity ?? 0;
        lens = lens * 0.7 + pop * 0.3;
        break;
      }
      default:
        lens = row.totalScore;
    }
    return { row, lens, index };
  });

  scored.sort((a, b) => {
    if (b.lens !== a.lens) {
      return b.lens - a.lens;
    }
    return a.index - b.index;
  });

  return [...scored.map((s) => s.row), ...rejected];
}
