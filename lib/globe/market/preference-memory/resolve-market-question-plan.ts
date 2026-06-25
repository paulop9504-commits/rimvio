import { isMarketPrioritySlotFilled } from "@/lib/globe/market/question-engine/is-market-priority-slot-filled";
import { resolveMarketQuestionProfile } from "@/lib/globe/market/question-engine/resolve-market-question-category";
import { resolveMarketQuestionEngine } from "@/lib/globe/market/question-engine/resolve-market-question-engine";
import type { MarketQuestionEngineInput } from "@/lib/globe/market/question-engine/types";
import {
  formatMarketPreferenceConfirmPrompt,
} from "@/lib/globe/market/preference-memory/format-market-preference-label";
import { findMarketPreferenceMemory } from "@/lib/globe/market/preference-memory/market-preference-memory-store";
import { readMarketSlotImportanceWeights } from "@/lib/globe/market/preference-memory/market-slot-importance";
import {
  MARKET_PREFERENCE_CONFIRM_THRESHOLD,
  type MarketQuestionPlan,
} from "@/lib/globe/market/preference-memory/market-preference-memory-types";

/**
 * Question engine + preference memory — confirm before ask when confidence is high.
 */
export function resolveMarketQuestionPlan(
  input: MarketQuestionEngineInput,
): MarketQuestionPlan {
  const profile = resolveMarketQuestionProfile({
    text: input.text,
    productName: input.productName,
    categoryId: input.categoryId,
  });
  const slotImportanceWeights = readMarketSlotImportanceWeights({
    categorySlug: profile.slug,
    role: input.role,
  });
  const engine = resolveMarketQuestionEngine({
    ...input,
    slotImportanceWeights,
  });
  const confirmations: MarketQuestionPlan["confirmations"] = [];
  const questions: MarketQuestionPlan["questions"] = [];

  for (const factor of engine.topFactors) {
    const filled = isMarketPrioritySlotFilled({
      slotId: factor.slotId,
      prioritySlots: input.existingDetail?.prioritySlots,
      priceMinKrw: input.priceMinKrw,
      priceMaxKrw: input.priceMaxKrw,
      conditionId: input.existingDetail?.conditionId,
    });
    if (filled) {
      continue;
    }

    const memory = findMarketPreferenceMemory({
      categorySlug: engine.category,
      categoryId: engine.categoryId,
      role: input.role,
      slotId: factor.slotId,
    });

    if (memory && memory.confidence >= MARKET_PREFERENCE_CONFIRM_THRESHOLD) {
      confirmations.push({
        memoryId: memory.id,
        key: factor.key,
        slotId: factor.slotId,
        value: memory.value,
        valueLabelKo: memory.valueLabelKo,
        confidence: memory.confidence,
        confirmPromptKo: formatMarketPreferenceConfirmPrompt({
          valueLabelKo: memory.valueLabelKo,
          role: input.role,
        }),
      });
      continue;
    }

    questions.push({
      key: factor.key,
      slotId: factor.slotId,
      weight: factor.weight,
      importance: factor.importance,
      question: factor.question,
      hintKo:
        memory && memory.confidence >= 0.4
          ? `지난번 · ${memory.valueLabelKo}`
          : undefined,
    });
  }

  return {
    category: engine.category,
    categoryId: engine.categoryId,
    confirmations,
    questions,
  };
}
