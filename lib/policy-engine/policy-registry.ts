/**
 * Policy registry — register and evaluate policies.
 */

import type { Policy, PolicyContext, PolicyCheckResult } from "@/lib/policy-engine/types";

const policies: Policy[] = [];

export function registerPolicy(policy: Policy): void {
  if (!policies.some((p) => p.policyId === policy.policyId)) {
    policies.push(policy);
  }
}

export function getRegisteredPolicies(): readonly Policy[] {
  return policies;
}

export function checkPolicies(ctx: PolicyContext): PolicyCheckResult {
  const evaluations = policies.map((p) => p.evaluate(ctx));
  const denials = evaluations.filter((e) => e.verdict === "deny");
  const approvals = evaluations.filter((e) => e.verdict === "require_approval");

  return {
    allowed: denials.length === 0,
    evaluations,
    denials,
    approvals,
  };
}

// Built-in policies

registerPolicy({
  policyId: "budget_ceiling",
  kind: "budget_limit",
  labelKo: "예산 상한",
  evaluate: (ctx) => {
    const limit = (ctx.metadata?.budgetLimitWon as number) ?? Infinity;
    const cost = ctx.estimatedCost ?? 0;
    if (cost > limit) {
      return {
        policyId: "budget_ceiling",
        verdict: "deny",
        reasonKo: `예상 비용 ${cost.toLocaleString()}원이 예산 ${limit.toLocaleString()}원을 초과합니다`,
      };
    }
    return { policyId: "budget_ceiling", verdict: "allow", reasonKo: "예산 범위 내" };
  },
});

registerPolicy({
  policyId: "payment_approval",
  kind: "company",
  labelKo: "결제 승인 필요",
  evaluate: (ctx) => {
    if (ctx.actionType === "payment" || ctx.actionType === "reserve") {
      return {
        policyId: "payment_approval",
        verdict: "require_approval",
        reasonKo: "결제/예약은 사용자 승인이 필요합니다",
        requiredAction: "human_approve",
      };
    }
    return { policyId: "payment_approval", verdict: "allow", reasonKo: "결제 아님" };
  },
});

registerPolicy({
  policyId: "rate_limit",
  kind: "rate_limit",
  labelKo: "API 호출 제한",
  evaluate: (ctx) => {
    const callCount = (ctx.metadata?.recentApiCalls as number) ?? 0;
    if (callCount > 100) {
      return {
        policyId: "rate_limit",
        verdict: "deny",
        reasonKo: "API 호출 한도를 초과했습니다. 잠시 후 다시 시도하세요",
      };
    }
    return { policyId: "rate_limit", verdict: "allow", reasonKo: "호출 한도 내" };
  },
});

registerPolicy({
  policyId: "safety_gate",
  kind: "safety",
  labelKo: "안전 정책",
  evaluate: (ctx) => {
    if (ctx.actionType === "delete_context" || ctx.actionType === "bulk_delete") {
      return {
        policyId: "safety_gate",
        verdict: "require_approval",
        reasonKo: "대량 삭제는 승인이 필요합니다",
        requiredAction: "human_approve",
      };
    }
    return { policyId: "safety_gate", verdict: "allow", reasonKo: "안전" };
  },
});
