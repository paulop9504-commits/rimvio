import { isMarketPrioritySlotFilled } from "@/lib/globe/market/question-engine/is-market-priority-slot-filled";
import { resolveMarketQuestionProfile } from "@/lib/globe/market/question-engine/resolve-market-question-category";
import { scoreMarketQuestionFactor } from "@/lib/globe/market/question-engine/score-market-question-factor";
import {
  MARKET_QUESTION_ENGINE_MAX,
  MARKET_QUESTION_ENGINE_RECOMMENDED,
  type MarketQuestionEngineInput,
  type MarketQuestionEngineResult,
  type MarketQuestionFactorDef,
} from "@/lib/globe/market/question-engine/types";

const GLOBAL_MIN_IMPORTANCE = 0.12;

function dedupeFactorsBySlot(
  ranked: Array<{ factor: MarketQuestionFactorDef; importance: number }>,
): Array<{ factor: MarketQuestionFactorDef; importance: number }> {
  const seen = new Set<string>();
  const out: Array<{ factor: MarketQuestionFactorDef; importance: number }> = [];
  for (const entry of ranked) {
    if (seen.has(entry.factor.slotId)) {
      continue;
    }
    seen.add(entry.factor.slotId);
    out.push(entry);
  }
  return out;
}

function normalizeWeights(
  items: Array<{ factor: MarketQuestionFactorDef; importance: number }>,
): Array<{ factor: MarketQuestionFactorDef; importance: number; weight: number }> {
  const sum = items.reduce((acc, item) => acc + item.importance, 0);
  if (sum <= 0) {
    return items.map((item) => ({ ...item, weight: 0 }));
  }
  return items.map((item) => ({
    ...item,
    weight: Math.round((item.importance / sum) * 100) / 100,
  }));
}

/**
 * Deterministic question engine — category matrix + text signals.
 * Picks top 3–5 factors that most improve match quality; never asks everything.
 */
export function resolveMarketQuestionEngine(
  input: MarketQuestionEngineInput,
): MarketQuestionEngineResult {
  const corpus = `${input.productName ?? ""} ${input.text}`.trim();
  const profile = resolveMarketQuestionProfile({
    text: input.text,
    productName: input.productName,
    categoryId: input.categoryId,
  });

  const maxQuestions = Math.min(
    MARKET_QUESTION_ENGINE_MAX,
    Math.max(MARKET_QUESTION_ENGINE_RECOMMENDED, input.maxQuestions ?? MARKET_QUESTION_ENGINE_RECOMMENDED),
  );

  const ranked = profile.factors
    .filter((factor) => {
      if (
        isMarketPrioritySlotFilled({
          slotId: factor.slotId,
          prioritySlots: input.existingDetail?.prioritySlots,
          priceMinKrw: input.priceMinKrw,
          priceMaxKrw: input.priceMaxKrw,
          conditionId: input.existingDetail?.conditionId,
        })
      ) {
        return false;
      }
      const importance = scoreMarketQuestionFactor({
        factor,
        corpus,
        frequentSlots: input.behaviorHints?.frequentSlots,
        skipSlots: input.behaviorHints?.skipSlots,
        slotImportance: input.slotImportanceWeights?.[factor.slotId],
      });
      const floor = factor.minImportance ?? GLOBAL_MIN_IMPORTANCE;
      return importance >= floor;
    })
    .map((factor) => ({
      factor,
      importance: scoreMarketQuestionFactor({
        factor,
        corpus,
        frequentSlots: input.behaviorHints?.frequentSlots,
        skipSlots: input.behaviorHints?.skipSlots,
        slotImportance: input.slotImportanceWeights?.[factor.slotId],
      }),
    }))
    .sort((a, b) => b.importance - a.importance);

  const deduped = dedupeFactorsBySlot(ranked).slice(0, maxQuestions);
  const normalized = normalizeWeights(deduped);

  return {
    category: profile.slug,
    categoryId: profile.categoryId,
    topFactors: normalized.map((entry) => ({
      key: entry.factor.key,
      slotId: entry.factor.slotId,
      weight: entry.weight,
      importance: Math.round(entry.importance * 100) / 100,
      question:
        input.role === "seeking"
          ? entry.factor.questionSeekingKo
          : entry.factor.questionListingKo,
    })),
  };
}
