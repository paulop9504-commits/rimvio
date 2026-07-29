/**
 * Reality Orchestration Pipeline — integrates ALL engines into one
 * deterministic flow that takes a user command to a Reality Commit.
 *
 * Flow:
 *   1. Memory recall (cross-context preferences)
 *   2. Constraint solve (feasibility check)
 *   3. Policy gate (allow / deny / require_approval)
 *   4. Plan decompose (goal → DAG)
 *   5. Agent delegation (capability match)
 *   6. Execute batch-by-batch (with LiveGraph mutations)
 *   7. Observation check (reality changes mid-execution)
 *   8. Validation pipeline (pre-commit checks)
 *   9. Transaction saga (atomic commit + undo window)
 *  10. Explanation record (why this outcome)
 *  11. Memory persist (learn preferences)
 */

import type { Constraint, ConstraintResource, ConstraintSolveResult } from "@/lib/constraint-solver";
import { solveConstraints } from "@/lib/constraint-solver";
import type { PolicyContext, PolicyCheckResult } from "@/lib/policy-engine";
import { checkPolicies } from "@/lib/policy-engine";
import type { PlanDAG } from "@/lib/reality-planner";
import { decomposeGoal, schedulePlanDag, mergePlanResults, replanOnFailure } from "@/lib/reality-planner";
import type { ValidationPipelineResult } from "@/lib/reality-validation";
import { runValidationPipeline } from "@/lib/reality-validation";
import type { TransactionSaga, StepExecutor as SagaStepExecutor, CompensationExecutor } from "@/lib/reality-transaction";
import { createSaga, executeSaga, rollbackSaga, saveSaga } from "@/lib/reality-transaction";
import { getPendingReplans } from "@/lib/observation-engine";
import type { DecisionExplanation, ExplanationFactor } from "@/lib/explanation-engine";
import { recordExplanation } from "@/lib/explanation-engine";
import { queryPreferences, learnPreference } from "@/lib/reality-memory";
import { resolveDelegate } from "@/lib/capability-registry/agent-delegation";
import type { CapabilityId } from "@/lib/capability-registry";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RealityPipelineInput = {
  readonly contextId: string;
  readonly goal: string;
  readonly goalKo: string;
  readonly domain: string;
  readonly constraints: readonly Constraint[];
  readonly resources: readonly ConstraintResource[];
  readonly estimatedCost?: number;
  readonly actionType: string;
  readonly requiredCapabilities: readonly CapabilityId[];
  readonly explanationFactors?: readonly ExplanationFactor[];
  readonly metadata?: Readonly<Record<string, unknown>>;
};

export type PipelineStage =
  | "memory_recall"
  | "constraint_solve"
  | "policy_gate"
  | "plan_decompose"
  | "agent_delegate"
  | "execute"
  | "observation_check"
  | "validate"
  | "transaction"
  | "explain"
  | "memory_persist";

export type PipelineStageResult = {
  readonly stage: PipelineStage;
  readonly ok: boolean;
  readonly durationMs: number;
  readonly detail?: string;
};

export type RealityPipelineResult = {
  readonly contextId: string;
  readonly goal: string;
  readonly success: boolean;
  readonly haltedAt: PipelineStage | null;
  readonly haltReason: string | null;
  readonly stages: readonly PipelineStageResult[];
  readonly constraintResult: ConstraintSolveResult | null;
  readonly policyResult: PolicyCheckResult | null;
  readonly plan: PlanDAG | null;
  readonly validation: ValidationPipelineResult | null;
  readonly saga: TransactionSaga | null;
  readonly explanation: DecisionExplanation | null;
  readonly totalDurationMs: number;
};

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export type PipelineStepExecutor = (stepId: string) => Promise<unknown>;

export async function runRealityPipeline(
  input: RealityPipelineInput,
  stepExecutor: PipelineStepExecutor,
  compensationExecutor: CompensationExecutor,
): Promise<RealityPipelineResult> {
  const t0 = Date.now();
  const stages: PipelineStageResult[] = [];
  let haltedAt: PipelineStage | null = null;
  let haltReason: string | null = null;

  let constraintResult: ConstraintSolveResult | null = null;
  let policyResult: PolicyCheckResult | null = null;
  let plan: PlanDAG | null = null;
  let validation: ValidationPipelineResult | null = null;
  let saga: TransactionSaga | null = null;
  let explanation: DecisionExplanation | null = null;

  function halt(stage: PipelineStage, reason: string) {
    haltedAt = stage;
    haltReason = reason;
  }

  function runStage(stage: PipelineStage, fn: () => string | null): boolean {
    const s = Date.now();
    const failReason = fn();
    stages.push({
      stage,
      ok: failReason === null,
      durationMs: Date.now() - s,
      detail: failReason ?? undefined,
    });
    if (failReason !== null) {
      halt(stage, failReason);
      return false;
    }
    return true;
  }

  // 1. Memory recall
  runStage("memory_recall", () => {
    const prefs = queryPreferences(input.domain);
    if (prefs.length > 0) {
      // preferences available — enrich is a no-fail step
    }
    return null;
  });
  if (haltedAt) return buildResult();

  // 2. Constraint solve
  if (!runStage("constraint_solve", () => {
    constraintResult = solveConstraints(input.constraints, input.resources);
    if (!constraintResult.feasible) {
      return `제약 조건 불충족: ${constraintResult.suggestionsKo.join("; ") || "조건 완화 필요"}`;
    }
    return null;
  })) return buildResult();

  // 3. Policy gate
  if (!runStage("policy_gate", () => {
    const ctx: PolicyContext = {
      contextEventId: input.contextId,
      actionType: input.actionType,
      estimatedCost: input.estimatedCost,
      metadata: input.metadata,
    };
    policyResult = checkPolicies(ctx);
    if (!policyResult.allowed) {
      const reasons = policyResult.denials.map((d) => d.reasonKo).join("; ");
      return `정책 거부: ${reasons}`;
    }
    if (policyResult.approvals.length > 0) {
      // require_approval — halt for human confirmation
      return `승인 필요: ${policyResult.approvals.map((a) => a.reasonKo).join("; ")}`;
    }
    return null;
  })) return buildResult();

  // 4. Plan decompose
  if (!runStage("plan_decompose", () => {
    plan = decomposeGoal({
      contextEventId: input.contextId,
      goal: input.goal,
      domain: input.domain,
    });
    if (plan.nodes.length === 0) {
      return "계획 분해 실패: 실행 가능한 작업 없음";
    }
    return null;
  })) return buildResult();

  // 5. Agent delegate
  if (!runStage("agent_delegate", () => {
    for (const cap of input.requiredCapabilities) {
      const decision = resolveDelegate(cap);
      if (!decision) {
        return `에이전트 부재: ${cap}를 처리할 수 있는 에이전트가 없습니다`;
      }
    }
    return null;
  })) return buildResult();

  // 6. Execute (batch-by-batch)
  const execStart = Date.now();
  if (plan) {
    const batches = schedulePlanDag(plan);
    for (const batch of batches) {
      const results = await Promise.all(
        batch.nodeIds.map(async (nodeId) => {
          try {
            const r = await stepExecutor(nodeId);
            return { nodeId, success: true, result: r };
          } catch (e) {
            return {
              nodeId,
              success: false,
              result: undefined,
              errorReason: e instanceof Error ? e.message : "unknown",
            };
          }
        }),
      );

      const nodeResults = results.map((r) => ({
        nodeId: r.nodeId,
        success: r.success,
        result: r.result,
        errorReason: (r as { errorReason?: string }).errorReason,
      }));

      plan = mergePlanResults(plan, nodeResults);

      const failed = nodeResults.filter((r) => !r.success);
      if (failed.length > 0) {
        plan = replanOnFailure(plan, failed[0]!.nodeId);
        if (plan.status === "failed") {
          stages.push({
            stage: "execute",
            ok: false,
            durationMs: Date.now() - execStart,
            detail: `실행 실패: ${failed[0]!.nodeId}`,
          });
          halt("execute", `작업 실행 실패: ${failed[0]!.nodeId}`);
          return buildResult();
        }
      }
    }
  }
  stages.push({ stage: "execute", ok: true, durationMs: Date.now() - execStart });

  // 7. Observation check
  runStage("observation_check", () => {
    const pending = getPendingReplans(input.contextId);
    if (pending.some((o) => o.severity === "critical")) {
      return `현실 변화 감지: ${pending.filter((o) => o.severity === "critical").map((o) => o.summaryKo).join("; ")}`;
    }
    return null;
  });
  if (haltedAt) return buildResult();

  // 8. Validate
  if (!runStage("validate", () => {
    validation = runValidationPipeline({
      contextEventId: input.contextId,
      operationIds: (plan?.nodes ?? []).filter((n) => n.status === "done").map((n) => n.id),
      constraints: [...input.constraints],
      approvedByHuman: input.actionType === "search" || input.actionType === "compare",
    });
    if (!validation.allPassed) {
      const reasons = validation.blockers.map((b) => b.reason ?? b.labelKo).join("; ");
      return `검증 실패: ${reasons}`;
    }
    return null;
  })) return buildResult();

  // 9. Transaction saga
  const sagaStart = Date.now();
  saga = createSaga({
    contextEventId: input.contextId,
    operations: (plan?.nodes ?? [])
      .filter((n) => n.status === "done")
      .map((n) => ({
        operationId: n.id,
        labelKo: n.labelKo,
        compensationAction: `undo_${n.id}`,
      })),
  });
  const sagaStepExecutor: SagaStepExecutor = async (step) => {
    try {
      const result = await stepExecutor(step.stepId);
      return { success: true, result };
    } catch (e) {
      return { success: false, errorReason: e instanceof Error ? e.message : "unknown" };
    }
  };
  saga = await executeSaga(saga, sagaStepExecutor);
  if (saga.status === "failed") {
    saga = await rollbackSaga(saga, compensationExecutor);
    stages.push({
      stage: "transaction",
      ok: false,
      durationMs: Date.now() - sagaStart,
      detail: "트랜잭션 실패 — 롤백 완료",
    });
    halt("transaction", "Reality Commit 실패 — 보상 트랜잭션 실행됨");
    return buildResult();
  }
  saveSaga(saga);
  stages.push({ stage: "transaction", ok: true, durationMs: Date.now() - sagaStart });

  // 10. Explanation
  runStage("explain", () => {
    if (input.explanationFactors && input.explanationFactors.length > 0) {
      explanation = recordExplanation(
        `dec-${input.contextId}-${Date.now()}`,
        input.contextId,
        input.goalKo,
        input.explanationFactors,
        1,
      );
    }
    return null;
  });

  // 11. Memory persist
  runStage("memory_persist", () => {
    learnPreference({
      key: `last_${input.domain}_action`,
      value: input.actionType,
      domain: input.domain,
      confidence: 0.8,
    });
    return null;
  });

  return buildResult();

  function buildResult(): RealityPipelineResult {
    return {
      contextId: input.contextId,
      goal: input.goal,
      success: haltedAt === null,
      haltedAt,
      haltReason,
      stages,
      constraintResult,
      policyResult,
      plan,
      validation,
      saga,
      explanation,
      totalDurationMs: Date.now() - t0,
    };
  }
}
