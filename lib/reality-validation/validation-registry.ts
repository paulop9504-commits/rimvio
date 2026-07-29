/**
 * Domain-specific validator registry.
 */

import type { ValidationCheck } from "@/lib/reality-validation/types";

const registry: ValidationCheck[] = [];

export function registerValidator(check: ValidationCheck): void {
  if (!registry.some((c) => c.checkId === check.checkId)) {
    registry.push(check);
  }
}

export function getRegisteredValidators(): readonly ValidationCheck[] {
  return registry;
}

registerValidator({
  checkId: "human_approval",
  domain: "system",
  labelKo: "사용자 승인",
  validate: (ctx) => ({
    checkId: "human_approval",
    domain: "system",
    status: ctx.approvedByHuman ? "pass" : "fail",
    labelKo: "사용자 승인",
    reason: ctx.approvedByHuman ? undefined : "사용자 승인이 필요합니다",
    requiredAction: ctx.approvedByHuman ? undefined : "approve",
  }),
});

registerValidator({
  checkId: "has_operations",
  domain: "system",
  labelKo: "실행 대상 확인",
  validate: (ctx) => ({
    checkId: "has_operations",
    domain: "system",
    status: ctx.operationIds.length > 0 ? "pass" : "fail",
    labelKo: "실행 대상 확인",
    reason: ctx.operationIds.length > 0 ? undefined : "실행할 항목이 없습니다",
  }),
});

registerValidator({
  checkId: "constraint_feasibility",
  domain: "constraint",
  labelKo: "조건 충족 확인",
  validate: (ctx) => {
    if (ctx.constraints.length === 0) {
      return {
        checkId: "constraint_feasibility",
        domain: "constraint",
        status: "pass",
        labelKo: "조건 충족 확인",
      };
    }
    const { solveConstraints } = require("@/lib/constraint-solver/solve-constraints") as typeof import("@/lib/constraint-solver/solve-constraints");
    const result = solveConstraints(ctx.constraints);
    return {
      checkId: "constraint_feasibility",
      domain: "constraint",
      status: result.feasible ? "pass" : "fail",
      labelKo: "조건 충족 확인",
      reason: result.feasible ? undefined : result.suggestionsKo.join("; "),
    };
  },
});
