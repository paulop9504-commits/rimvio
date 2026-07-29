/**
 * Policy Engine — checks policies before any reality-mutating action.
 *
 * Sits between Constraint Solver and Execution:
 *   constraints satisfied → policy check → execution allowed/denied
 */

export type PolicyKind =
  | "company"
  | "user_setting"
  | "regulation"
  | "budget_limit"
  | "time_limit"
  | "rate_limit"
  | "safety";

export type PolicyVerdict = "allow" | "deny" | "require_approval";

export type Policy = {
  readonly policyId: string;
  readonly kind: PolicyKind;
  readonly labelKo: string;
  readonly evaluate: (ctx: PolicyContext) => PolicyEvaluation;
};

export type PolicyContext = {
  readonly contextEventId: string;
  readonly actionType: string;
  readonly agentId?: string;
  readonly estimatedCost?: number;
  readonly currency?: string;
  readonly userLocale?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
};

export type PolicyEvaluation = {
  readonly policyId: string;
  readonly verdict: PolicyVerdict;
  readonly reasonKo: string;
  readonly requiredAction?: string;
};

export type PolicyCheckResult = {
  readonly allowed: boolean;
  readonly evaluations: readonly PolicyEvaluation[];
  readonly denials: readonly PolicyEvaluation[];
  readonly approvals: readonly PolicyEvaluation[];
};
