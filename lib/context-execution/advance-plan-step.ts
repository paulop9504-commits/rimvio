/**
 * Advance Execution Plan step status — Runtime mutation (L3).
 * Blueprint (L2) stays immutable; step lifecycle lives on Plan only.
 */

import type {
  AdvancePlanStepInput,
  ContextExecutionPlanV1,
  ExecutionPlanStepStatus,
  ExecutionPlanStepV1,
} from "@/lib/context-execution/types";

const ACTIVE_STEP_STATUS_PRIORITY = [
  "running",
  "ready",
  "prepared",
  "waiting_approval",
  "pending",
] as const;

function resolveCurrentStepId(steps: readonly ExecutionPlanStepV1[]): string | null {
  for (const status of ACTIVE_STEP_STATUS_PRIORITY) {
    const hit = steps.find((step) => step.status === status);
    if (hit) {
      return hit.stepId;
    }
  }
  return steps.find((step) => step.status !== "done")?.stepId ?? steps.at(-1)?.stepId ?? null;
}

export function advanceContextExecutionPlanStep(
  input: AdvancePlanStepInput,
): ContextExecutionPlanV1 {
  const nowIso = (input.now ?? new Date()).toISOString();
  const steps = input.plan.steps.map((step) => {
    if (step.nodeId !== input.nodeId) {
      return step;
    }
    return {
      ...step,
      status: input.status,
      lastError: input.lastError ?? null,
      updatedAtIso: nowIso,
    };
  });
  return {
    ...input.plan,
    steps,
    currentStepId: resolveCurrentStepId(steps),
    updatedAtIso: nowIso,
  };
}

export function patchContextExecutionPlanSteps(input: {
  plan: ContextExecutionPlanV1;
  patches: ReadonlyArray<{
    nodeId: string;
    status: ExecutionPlanStepStatus;
    lastError?: string | null;
  }>;
  now?: Date;
}): ContextExecutionPlanV1 {
  let plan = input.plan;
  for (const patch of input.patches) {
    plan = advanceContextExecutionPlanStep({
      plan,
      nodeId: patch.nodeId,
      status: patch.status,
      lastError: patch.lastError,
      now: input.now,
    });
  }
  return plan;
}

export function approveContextExecutionPlan(input: {
  plan: ContextExecutionPlanV1;
  now?: Date;
}): ContextExecutionPlanV1 {
  const nowIso = (input.now ?? new Date()).toISOString();
  return {
    ...input.plan,
    approval: "approved",
    osPhase: "executing",
    updatedAtIso: nowIso,
  };
}

/** User tapped plan approval — start Runtime on the active step. */
export function startContextExecutionPlanRuntime(input: {
  plan: ContextExecutionPlanV1;
  now?: Date;
}): ContextExecutionPlanV1 {
  const approved = approveContextExecutionPlan(input);
  const current =
    approved.steps.find((step) => step.stepId === approved.currentStepId) ??
    approved.steps.find((step) => step.status === "running" || step.status === "ready") ??
    approved.steps.find((step) => step.status === "pending");
  if (!current || current.status === "running" || current.status === "done") {
    return approved;
  }
  return advanceContextExecutionPlanStep({
    plan: approved,
    nodeId: current.nodeId,
    status: "running",
    now: input.now,
  });
}

const COMPLETABLE_STEP_STATUSES = new Set<ExecutionPlanStepStatus>([
  "prepared",
  "waiting_approval",
  "ready",
]);

const TERMINAL_STEP_STATUSES = new Set<ExecutionPlanStepStatus>([
  "done",
  "blocked",
]);

function isCompletableStep(step: ExecutionPlanStepV1): boolean {
  return COMPLETABLE_STEP_STATUSES.has(step.status);
}

/**
 * Cursor-style sequencer — prepared → done → next running.
 * Never completes a bare `running` step (that still needs scout/MAIN → prepared).
 */
export function completeActiveExecutionPlanStepAndAdvance(input: {
  plan: ContextExecutionPlanV1;
  /** Prefer this node when it is completable; otherwise fall back to current/active. */
  nodeId?: string | null;
  now?: Date;
}): ContextExecutionPlanV1 {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const explicit = input.nodeId?.trim();
  const candidate =
    (explicit
      ? input.plan.steps.find(
          (step) => step.nodeId === explicit && isCompletableStep(step),
        )
      : null) ??
    input.plan.steps.find((step) => isCompletableStep(step)) ??
    (input.plan.currentStepId
      ? input.plan.steps.find(
          (step) =>
            step.stepId === input.plan.currentStepId && isCompletableStep(step),
        )
      : null);

  if (!candidate) {
    const allTerminal = input.plan.steps.every((step) =>
      TERMINAL_STEP_STATUSES.has(step.status),
    );
    if (allTerminal && input.plan.steps.length > 0) {
      return {
        ...input.plan,
        approval: "approved",
        osPhase: "committed",
        currentStepId: null,
        updatedAtIso: nowIso,
      };
    }
    return input.plan;
  }

  let plan = advanceContextExecutionPlanStep({
    plan: input.plan,
    nodeId: candidate.nodeId,
    status: "done",
    lastError: null,
    now,
  });

  const nextPending = [...plan.steps]
    .filter(
      (step) => step.status === "pending" && step.order > candidate.order,
    )
    .sort((a, b) => a.order - b.order)[0];

  if (nextPending) {
    plan = advanceContextExecutionPlanStep({
      plan,
      nodeId: nextPending.nodeId,
      status: "running",
      now,
    });
    return {
      ...plan,
      approval: "approved",
      osPhase: "executing",
      updatedAtIso: nowIso,
    };
  }

  const allTerminal = plan.steps.every((step) =>
    TERMINAL_STEP_STATUSES.has(step.status),
  );
  if (allTerminal) {
    return {
      ...plan,
      approval: "approved",
      osPhase: "committed",
      currentStepId: null,
      updatedAtIso: nowIso,
    };
  }

  return {
    ...plan,
    approval: "approved",
    osPhase: "execution_prepared",
    updatedAtIso: nowIso,
  };
}
