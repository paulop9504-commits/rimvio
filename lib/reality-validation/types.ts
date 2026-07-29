/**
 * Reality Validation Pipeline — unified pre-commit checks.
 */

export type ValidationCheckResult = {
  readonly checkId: string;
  readonly domain: string;
  readonly status: "pass" | "fail" | "warn";
  readonly labelKo: string;
  readonly reason?: string;
  readonly requiredAction?: string;
};

export type ValidationContext = {
  readonly contextEventId: string;
  readonly operationIds: readonly string[];
  readonly constraints: readonly import("@/lib/constraint-solver/types").Constraint[];
  readonly approvedByHuman: boolean;
};

export type ValidationCheck = {
  readonly checkId: string;
  readonly domain: string;
  readonly labelKo: string;
  readonly validate: (ctx: ValidationContext) => ValidationCheckResult;
};

export type ValidationPipelineResult = {
  readonly allPassed: boolean;
  readonly checks: readonly ValidationCheckResult[];
  readonly blockers: readonly ValidationCheckResult[];
  readonly warnings: readonly ValidationCheckResult[];
};
