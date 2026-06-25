import type { MarketCategoryId, MarketIntentRole } from "@/lib/globe/market/market-intent-types";
import type { MarketPrioritySlotId } from "@/lib/globe/market/market-priority-matrix";
import type { MarketIntentDetail } from "@/lib/globe/market/market-intent-detail";

export const MARKET_QUESTION_ENGINE_MAX = 5;
export const MARKET_QUESTION_ENGINE_RECOMMENDED = 3;

export type MarketQuestionEngineCategorySlug =
  | "smartphone"
  | "laptop"
  | "camera"
  | "vehicle"
  | "camping"
  | "fashion"
  | "furniture"
  | "bike"
  | "general";

export type MarketQuestionFactorResult = {
  /** camelCase factor id — API contract */
  key: string;
  slotId: MarketPrioritySlotId;
  /** Normalized share among selected factors (sums ~1). */
  weight: number;
  /** Raw importance score before normalization (0–1). */
  importance: number;
  question: string;
};

export type MarketQuestionEngineResult = {
  category: MarketQuestionEngineCategorySlug;
  categoryId: MarketCategoryId;
  topFactors: MarketQuestionFactorResult[];
};

export type MarketQuestionBehaviorHints = {
  /** Prioritize slots the user often fills in this category. */
  frequentSlots?: readonly MarketPrioritySlotId[];
  /** Deprioritize slots rarely correlated with successful matches. */
  skipSlots?: readonly MarketPrioritySlotId[];
};

export type MarketQuestionEngineInput = {
  text: string;
  productName?: string;
  categoryId?: MarketCategoryId;
  role: MarketIntentRole;
  existingDetail?: Pick<
    MarketIntentDetail,
    "prioritySlots" | "conditionId" | "detailNote"
  >;
  priceMinKrw?: number | null;
  priceMaxKrw?: number | null;
  behaviorHints?: MarketQuestionBehaviorHints;
  /** Learned slot importance weights for question ordering. */
  slotImportanceWeights?: Partial<Record<MarketPrioritySlotId, number>>;
  /** Override max questions (default 5, capped). */
  maxQuestions?: number;
};

export type MarketQuestionFactorDef = {
  key: string;
  slotId: MarketPrioritySlotId;
  baseWeight: number;
  questionSeekingKo: string;
  questionListingKo: string;
  /** Skip question when normalized importance would stay below this. */
  minImportance?: number;
};

export type MarketQuestionCategoryProfile = {
  slug: MarketQuestionEngineCategorySlug;
  categoryId: MarketCategoryId;
  factors: readonly MarketQuestionFactorDef[];
};
