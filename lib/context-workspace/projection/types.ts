/**
 * Workspace Projection Layer — UI observation mode over Workspace SSOT.
 * Not part of Context / Node Entity schema. Links via contextEventId.
 *
 * Compare is NOT a sheet-open flag — it is projection mode `compare_decision`.
 */

export const WORKSPACE_PROJECTION_MODES = ["default", "compare_decision"] as const;

export type WorkspaceProjectionMode = (typeof WORKSPACE_PROJECTION_MODES)[number];

/** Domain-agnostic Decision criteria weights (sum need not be 1 until normalize). */
export type CompareDecisionCriteriaWeights = {
  readonly price: number;
  readonly location: number;
  readonly scheduleFit: number;
};

/** Osaka Trip-style Context weights — location + schedule first. */
export const TRIP_CONTEXT_COMPARE_WEIGHTS: CompareDecisionCriteriaWeights = {
  price: 0.2,
  location: 0.4,
  scheduleFit: 0.4,
};

export const DEFAULT_COMPARE_CRITERIA_WEIGHTS: CompareDecisionCriteriaWeights =
  TRIP_CONTEXT_COMPARE_WEIGHTS;

/**
 * Relationship projection for Compare Decision (Object → Relationship → Decision).
 * Entity ids only — no hotel-specific fields.
 */
export type CompareDecisionRelationship = {
  readonly id: string;
  readonly fromEntityId: string;
  readonly toEntityId: string;
  readonly kind: "nearby" | "route" | "compare";
  readonly labelKo: string;
  readonly meters: number | null;
};

/**
 * Decision Projection — Context-weighted judgment, not a price/rating card.
 *
 * Wrong:  가격 12만원 · 평점 4.8
 * Right:  92점 · "3일차 USJ 방문 후 이동 최소"
 */
export type DecisionProjectionScores = {
  readonly price: number;
  readonly location: number;
  readonly scheduleFit: number;
  /** 0–100 integer for UI */
  readonly total: number;
};

export type DecisionProjectionAction = "select";

export type DecisionProjection = {
  readonly mode: "compare_decision";
  readonly entityId: string;
  readonly titleKo: string;
  /** Entity hero — Decision Callout only (not list gallery). */
  readonly imageUrl: string | null;
  readonly scores: DecisionProjectionScores;
  readonly weights: CompareDecisionCriteriaWeights;
  readonly judgmentKo: string;
  readonly relationships: readonly CompareDecisionRelationship[];
  readonly actions: readonly DecisionProjectionAction[];
};

/**
 * Compare Decision Projection State — reusable across lodging / eatery / … domains.
 *
 * ❌ hotel_compare_state
 * ✅ compare_decision_projection
 */
export type CompareDecisionState = {
  readonly mode: "compare_decision";
  readonly contextEventId: string;
  readonly candidateEntityIds: readonly string[];
  readonly criteriaWeights: CompareDecisionCriteriaWeights;
  readonly selectedEntityId: string | null;
  readonly relationships: readonly CompareDecisionRelationship[];
};

export type WorkspaceProjectionState =
  | {
      readonly mode: "default";
      readonly contextEventId: string;
    }
  | CompareDecisionState;
