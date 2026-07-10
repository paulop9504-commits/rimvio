import type { ContextConditionRecommendation } from "@/lib/globe/context-condition-ai/local-discovery-action-types";

/** Rank-1 lodging candidate for one-shot prep MAIN slot. */
export function resolveLodgingPrepMainRecommendation(
  recommendations: readonly ContextConditionRecommendation[],
): ContextConditionRecommendation | null {
  const lodging = recommendations.filter((row) => row.kind === "lodging");
  if (lodging.length === 0) {
    return null;
  }
  return [...lodging].sort((left, right) => left.rank - right.rank)[0] ?? null;
}
