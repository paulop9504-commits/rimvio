import type { MarketCategoryId, MarketIntentRole } from "@/lib/globe/market/market-intent-types";
import type { MarketPrioritySlotId } from "@/lib/globe/market/market-priority-matrix";
import type { MarketQuestionEngineCategorySlug } from "@/lib/globe/market/question-engine/types";

export const MARKET_PREFERENCE_MEMORY_SCHEMA = "market.preference.v1" as const;

/** Confidence at or above → confirm instead of ask. */
export const MARKET_PREFERENCE_CONFIRM_THRESHOLD = 0.72;

export type MarketPreferenceSignalKind =
  | "save_answer"
  | "confirm_apply"
  | "confirm_reject"
  | "skip_question"
  | "trade_complete";

export type MarketPreferenceMemorySignals = {
  savedAnswers: number;
  confirmsAccepted: number;
  confirmsRejected: number;
  skips: number;
  tradesCompleted: number;
};

export type MarketPreferenceMemoryEntry = {
  schemaVersion: typeof MARKET_PREFERENCE_MEMORY_SCHEMA;
  id: string;
  categorySlug: MarketQuestionEngineCategorySlug;
  categoryId: MarketCategoryId;
  role: MarketIntentRole;
  slotId: MarketPrioritySlotId;
  factorKey: string;
  value: string | number | boolean;
  valueLabelKo: string;
  confidence: number;
  signals: MarketPreferenceMemorySignals;
  updatedAt: string;
  lastAppliedAt?: string;
};

export type MarketPreferenceConfirmation = {
  memoryId: string;
  key: string;
  slotId: MarketPrioritySlotId;
  value: string | number | boolean;
  valueLabelKo: string;
  confidence: number;
  confirmPromptKo: string;
};

export type MarketPreferenceQuestion = {
  key: string;
  slotId: MarketPrioritySlotId;
  weight: number;
  importance: number;
  question: string;
  hintKo?: string;
};

export type MarketQuestionPlan = {
  category: MarketQuestionEngineCategorySlug;
  categoryId: MarketCategoryId;
  confirmations: MarketPreferenceConfirmation[];
  questions: MarketPreferenceQuestion[];
};
