/**
 * Explanation store — build and retrieve decision explanations.
 */

import type {
  DecisionExplanation,
  ExplanationFactor,
} from "@/lib/explanation-engine/types";

const explanations: Map<string, DecisionExplanation> = new Map();

export function recordExplanation(
  decisionId: string,
  entityId: string,
  entityLabel: string,
  factors: readonly ExplanationFactor[],
  alternativeCount: number,
): DecisionExplanation {
  const satisfied = factors.filter((f) => f.satisfied);
  const summaryKo = satisfied.length > 0
    ? `${entityLabel}: ${satisfied.map((f) => `✓ ${f.labelKo}`).join(" · ")}`
    : `${entityLabel}: 조건 없음`;

  const explanation: DecisionExplanation = {
    decisionId,
    entityId,
    entityLabel,
    chosenOverAlternatives: alternativeCount,
    factors,
    summaryKo,
    createdAt: new Date().toISOString(),
  };

  explanations.set(decisionId, explanation);
  return explanation;
}

export function getExplanation(decisionId: string): DecisionExplanation | null {
  return explanations.get(decisionId) ?? null;
}

export function getExplanationsForEntity(entityId: string): readonly DecisionExplanation[] {
  return [...explanations.values()].filter((e) => e.entityId === entityId);
}

export function formatExplanationKo(explanation: DecisionExplanation): string {
  const lines = [
    `${explanation.entityLabel} 선택 이유 (${explanation.chosenOverAlternatives}개 후보 중)`,
    ...explanation.factors.map((f) =>
      f.satisfied
        ? `  ✓ ${f.labelKo}${f.value != null ? ` (${f.value})` : ""}`
        : `  ✗ ${f.labelKo}${f.value != null ? ` (${f.value})` : ""}`,
    ),
  ];
  return lines.join("\n");
}
