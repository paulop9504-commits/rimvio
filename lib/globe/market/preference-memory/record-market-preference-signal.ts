import {
  formatMarketPreferenceValueLabelKo,
} from "@/lib/globe/market/preference-memory/format-market-preference-label";
import {
  findMarketPreferenceMemory,
  marketPreferenceMemoryId,
  upsertMarketPreferenceMemory,
} from "@/lib/globe/market/preference-memory/market-preference-memory-store";
import type {
  MarketPreferenceMemoryEntry,
  MarketPreferenceSignalKind,
} from "@/lib/globe/market/preference-memory/market-preference-memory-types";
import type { MarketCategoryId, MarketIntentRole } from "@/lib/globe/market/market-intent-types";
import type { MarketPrioritySlotId } from "@/lib/globe/market/market-priority-matrix";
import type { MarketQuestionEngineCategorySlug } from "@/lib/globe/market/question-engine/types";
import { bumpMarketSlotImportance } from "@/lib/globe/market/preference-memory/market-slot-importance";

const INITIAL_SAVE_CONFIDENCE = 0.58;

function clampConfidence(value: number): number {
  return Math.max(0.05, Math.min(0.98, Math.round(value * 1000) / 1000));
}

function applySignalDelta(
  confidence: number,
  kind: MarketPreferenceSignalKind,
): number {
  switch (kind) {
    case "save_answer":
      return confidence + 0.1;
    case "confirm_apply":
      return confidence + 0.16;
    case "confirm_reject":
      return confidence - 0.22;
    case "skip_question":
      return confidence - 0.09;
    case "trade_complete":
      return confidence + 0.12;
    default:
      return confidence;
  }
}

function bumpSignals(
  signals: MarketPreferenceMemoryEntry["signals"],
  kind: MarketPreferenceSignalKind,
): MarketPreferenceMemoryEntry["signals"] {
  const next = { ...signals };
  switch (kind) {
    case "save_answer":
      next.savedAnswers += 1;
      break;
    case "confirm_apply":
      next.confirmsAccepted += 1;
      break;
    case "confirm_reject":
      next.confirmsRejected += 1;
      break;
    case "skip_question":
      next.skips += 1;
      break;
    case "trade_complete":
      next.tradesCompleted += 1;
      break;
    default:
      break;
  }
  return next;
}

export function recordMarketPreferenceSignal(input: {
  categorySlug: MarketQuestionEngineCategorySlug;
  categoryId: MarketCategoryId;
  role: MarketIntentRole;
  slotId: MarketPrioritySlotId;
  factorKey: string;
  value: string | number | boolean;
  kind: MarketPreferenceSignalKind;
}): MarketPreferenceMemoryEntry {
  const id = marketPreferenceMemoryId(input);
  const existing = findMarketPreferenceMemory(input);
  const valueLabelKo = formatMarketPreferenceValueLabelKo({
    slotId: input.slotId,
    value: input.value,
    role: input.role,
  });

  const baseConfidence =
    input.kind === "save_answer" && !existing
      ? INITIAL_SAVE_CONFIDENCE
      : (existing?.confidence ?? INITIAL_SAVE_CONFIDENCE);

  const sameValue =
    existing &&
    JSON.stringify(existing.value) === JSON.stringify(input.value);

  let confidence = applySignalDelta(
    sameValue || input.kind === "save_answer" || input.kind === "confirm_apply"
      ? baseConfidence
      : Math.max(0.2, baseConfidence - 0.15),
    input.kind,
  );

  if (input.kind === "save_answer" && !existing) {
    confidence = INITIAL_SAVE_CONFIDENCE;
  }

  const signals = bumpSignals(existing?.signals ?? {
    savedAnswers: 0,
    confirmsAccepted: 0,
    confirmsRejected: 0,
    skips: 0,
    tradesCompleted: 0,
  }, input.kind);

  const entry = upsertMarketPreferenceMemory({
    id,
    categorySlug: input.categorySlug,
    categoryId: input.categoryId,
    role: input.role,
    slotId: input.slotId,
    factorKey: input.factorKey,
    value: input.value,
    valueLabelKo,
    confidence: clampConfidence(confidence),
    signals,
    lastAppliedAt:
      input.kind === "confirm_apply" || input.kind === "save_answer"
        ? new Date().toISOString()
        : existing?.lastAppliedAt,
  });

  if (
    input.kind === "save_answer" ||
    input.kind === "confirm_apply" ||
    input.kind === "trade_complete"
  ) {
    bumpMarketSlotImportance({
      categorySlug: input.categorySlug,
      role: input.role,
      slotId: input.slotId,
      delta: input.kind === "trade_complete" ? 0.06 : 0.08,
    });
  }

  return entry;
}
