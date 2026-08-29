/**
 * Platform Agent Orchestrator — deterministic loop owner (not LLM).
 *
 * State + Planner + Policy → LLM (decision) → Capability Executor → Observation → Verifier
 *                                                              ↓
 *                                                         DONE / REPLAN
 */

import type { HubAgentPlanStep } from "@/lib/hub/dev/hub-agent-loop";
import type { PlatformGoal } from "@/lib/hub/dev/platform-agent/platform-goal";
import {
  mapHubLoopPhaseToExecutionPhase,
  type RimvioPlatformExecutionPhase,
} from "@/lib/hub/dev/platform-agent/execution-loop";
import {
  applyPartialReplanToGoalState,
  createPlatformGoalState,
  markGoalStepBlocked,
  markGoalStepCompleted,
  markGoalStepRunning,
  summarizeGoalStateKo,
  type PlatformGoalState,
} from "@/lib/hub/dev/platform-agent/goal-state";
import {
  createExecutionLedger,
  ledgerCapabilityEntry,
  ledgerPhaseEntry,
  ledgerReplanEntry,
  ledgerVerificationEntry,
  type ExecutionLedger,
} from "@/lib/hub/dev/platform-agent/execution-ledger";

export type PlatformOrchestratorDecision = "continue" | "replan" | "done" | "blocked";

export type PlatformOrchestratorContext = {
  readonly goalState: PlatformGoalState;
  readonly ledger: ExecutionLedger;
  readonly currentPhase: RimvioPlatformExecutionPhase;
  readonly maxReplans: number;
};

export function initPlatformOrchestrator(input: {
  readonly goal: PlatformGoal;
  readonly planSteps?: readonly HubAgentPlanStep[];
  readonly maxReplans?: number;
}): PlatformOrchestratorContext {
  const goalState = createPlatformGoalState({
    goal: input.goal,
    planSteps: input.planSteps,
  });
  return {
    goalState,
    ledger: createExecutionLedger(goalState.goalId),
    currentPhase: "goal_intake",
    maxReplans: input.maxReplans ?? 3,
  };
}

export function advanceOrchestratorPhase(
  ctx: PlatformOrchestratorContext,
  hubPhase: string,
  detailKo?: string,
): PlatformOrchestratorContext {
  const phase = mapHubLoopPhaseToExecutionPhase(hubPhase);
  return {
    ...ctx,
    currentPhase: phase,
    ledger: ledgerPhaseEntry(ctx.ledger, phase, detailKo ?? phase),
  };
}

export function recordOrchestratorStepStart(
  ctx: PlatformOrchestratorContext,
  step: HubAgentPlanStep,
): PlatformOrchestratorContext {
  return {
    ...ctx,
    goalState: markGoalStepRunning(ctx.goalState, step.id),
    ledger: ledgerCapabilityEntry(ctx.ledger, {
      phase: "act",
      toolId: step.toolId,
      capabilityId: String(step.args?.capability ?? step.args?.provider ?? ""),
      success: true,
      summaryKo: `시작 · ${step.label}`,
    }),
  };
}

export function recordOrchestratorStepResult(
  ctx: PlatformOrchestratorContext,
  step: HubAgentPlanStep,
  success: boolean,
  detailKo: string,
): PlatformOrchestratorContext {
  const goalState = success
    ? markGoalStepCompleted(ctx.goalState, step.id)
    : markGoalStepBlocked(ctx.goalState, step.id, detailKo);

  return {
    ...ctx,
    goalState,
    ledger: ledgerCapabilityEntry(ctx.ledger, {
      phase: success ? "observe" : "replan",
      toolId: step.toolId,
      capabilityId: String(step.args?.capability ?? ""),
      success,
      summaryKo: detailKo,
    }),
  };
}

export function evaluateOrchestratorVerification(
  ctx: PlatformOrchestratorContext,
  ok: boolean,
  detailKo: string,
): { readonly ctx: PlatformOrchestratorContext; readonly decision: PlatformOrchestratorDecision } {
  const ledger = ledgerVerificationEntry(ctx.ledger, ok, detailKo);
  const nextCtx = { ...ctx, ledger, currentPhase: "verify" as const };

  if (ok) {
    const pending = nextCtx.goalState.pending.length + (nextCtx.goalState.inProgress ? 1 : 0);
    return {
      ctx: nextCtx,
      decision: pending === 0 ? "done" : "continue",
    };
  }

  if (nextCtx.goalState.replanCount >= nextCtx.maxReplans) {
    return { ctx: nextCtx, decision: "blocked" };
  }

  return { ctx: nextCtx, decision: "replan" };
}

/** Partial replan — impact surgery, not full plan discard. */
export function orchestratorPartialReplan(
  ctx: PlatformOrchestratorContext,
  input: {
    readonly failedStepId: string;
    readonly repairSteps: readonly HubAgentPlanStep[];
    readonly reasonKo: string;
  },
): PlatformOrchestratorContext {
  const replacementIds = input.repairSteps.map((s) => s.id);
  return {
    ...ctx,
    currentPhase: "replan",
    goalState: applyPartialReplanToGoalState(ctx.goalState, {
      failedStepId: input.failedStepId,
      replacementStepIds: replacementIds,
      reasonKo: input.reasonKo,
    }),
    ledger: ledgerReplanEntry(ctx.ledger, input.reasonKo),
  };
}

export function orchestratorWorkLog(ctx: PlatformOrchestratorContext): string {
  return `${summarizeGoalStateKo(ctx.goalState)} · ${ctx.currentPhase}`;
}
