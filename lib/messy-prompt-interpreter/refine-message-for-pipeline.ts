import { isInstantEaterySearch } from "@/lib/globe/context-condition-ai/instant-eatery-search";
import { isInstantLodgingSearch } from "@/lib/globe/context-condition-ai/instant-lodging-search";
import { isInstantPoiSearch } from "@/lib/globe/context-condition-ai/instant-poi-search";
import { utteranceHasConcreteDishSlot } from "@/lib/globe/context-condition-ai/utterance-intent-slots";
import type { InterpretAndExecuteResult } from "@/lib/messy-prompt-interpreter/types";

/**
 * Map interpreter output → text downstream pipelines can parse.
 * Preserves user intent while collapsing slang / filler.
 */
export function refineMessageForPipeline(
  messyInput: string,
  result: InterpretAndExecuteResult,
): string {
  const original = messyInput.trim();
  const { ir, normalizedInput, intent } = result;

  if (!original) {
    return original;
  }

  // Never replace a concrete scout noun with abstract task IR
  // ("식사·맛집 맞추기 — …") — that drops dish focus and revives prior thread.
  if (
    utteranceHasConcreteDishSlot(original) ||
    isInstantEaterySearch(original) ||
    isInstantLodgingSearch(original) ||
    isInstantPoiSearch(original)
  ) {
    return original;
  }

  const normalized = normalizedInput.trim();
  const summary = ir.summaryKo.trim();

  if (
    (intent.domain === "lodging" ||
      intent.domain === "eatery" ||
      intent.domain === "navigation" ||
      intent.domain === "travel_planning") &&
    summary.length >= 6
  ) {
    const constraintLine =
      intent.constraints.length > 0 ? intent.constraints.join(" · ") : "";
    if (constraintLine && !summary.includes(constraintLine.slice(0, 8))) {
      return `${summary} — ${constraintLine}`;
    }
    return summary;
  }

  if (
    normalized &&
    normalized !== original &&
    normalized.length >= Math.min(original.length, 12)
  ) {
    return normalized;
  }

  if (intent.confidence >= 0.45 && summary.length >= 6) {
    return summary;
  }

  return original;
}
