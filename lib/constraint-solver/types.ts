/**
 * Constraint Solver Engine — multi-condition cross-validation.
 *
 * "예산 150만 + 4박 + 캡슐호텔 + USJ + 비 회피" 같은 복합 조건을
 * 동시에 해결하고, 불가능하면 완화 제안을 반환한다.
 */

export type ConstraintKind =
  | "budget"
  | "time"
  | "location"
  | "preference"
  | "availability"
  | "weather"
  | "policy";

export type Constraint = {
  readonly id: string;
  readonly kind: ConstraintKind;
  readonly expression: string;
  readonly priority: "hard" | "soft";
  readonly source: "user" | "system" | "domain";
};

export type ConstraintConflict = {
  readonly constraintIds: [string, string];
  readonly reason: string;
  readonly resolutionHintKo: string;
};

export type ConstraintResource = {
  readonly id: string;
  readonly kind: string;
  readonly satisfies: readonly string[];
  readonly cost?: number;
};

export type ConstraintSolveResult = {
  readonly feasible: boolean;
  readonly conflicts: readonly ConstraintConflict[];
  readonly satisfiedIds: readonly string[];
  readonly violatedIds: readonly string[];
  readonly suggestionsKo: readonly string[];
};
