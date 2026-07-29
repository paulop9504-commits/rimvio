/**
 * Explanation Engine — tracks decision rationale so every AI choice
 * can be explained to the user with concrete evidence.
 */

export type ExplanationFactorKind =
  | "budget"
  | "distance"
  | "review_score"
  | "availability"
  | "preference_match"
  | "time_efficiency"
  | "weather"
  | "policy_compliance"
  | "constraint_satisfaction"
  | "popularity"
  | "custom";

export type ExplanationFactor = {
  readonly kind: ExplanationFactorKind;
  readonly labelKo: string;
  readonly satisfied: boolean;
  readonly value?: string | number;
  readonly threshold?: string | number;
};

export type DecisionExplanation = {
  readonly decisionId: string;
  readonly entityId: string;
  readonly entityLabel: string;
  readonly chosenOverAlternatives: number;
  readonly factors: readonly ExplanationFactor[];
  readonly summaryKo: string;
  readonly createdAt: string;
};
