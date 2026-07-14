/**
 * Advance Execution Plan through plan gate + per-step Commit (Cursor-style walk).
 * One approval completes the prepared step and starts the next — does not collapse
 * the whole multi-day graph in a single tap.
 */

import {
  completeActiveExecutionPlanStepAndAdvance,
  startContextExecutionPlanRuntime,
} from "@/lib/context-execution/advance-plan-step";
import type { ContextExecutionPlanV1 } from "@/lib/context-execution/types";

function markAllCompletableStepsDone(
  plan: ContextExecutionPlanV1,
  nowIso: string,
): ContextExecutionPlanV1 {
  const steps = plan.steps.map((step) => {
    if (
      step.status === "prepared" ||
      step.status === "ready" ||
      step.status === "waiting_approval" ||
      step.status === "running"
    ) {
      return {
        ...step,
        status: "done" as const,
        updatedAtIso: nowIso,
        lastError: null,
      };
    }
    return step;
  });
  const remaining = steps.find(
    (step) => step.status !== "done" && step.status !== "blocked",
  );
  return {
    ...plan,
    steps,
    approval: "approved",
    osPhase: remaining ? "execution_prepared" : "committed",
    currentStepId: remaining?.stepId ?? null,
    updatedAtIso: nowIso,
  };
}

/** True when every non-terminal step is completable (no later pending legs). */
function canFinalizeAllPreparedSteps(plan: ContextExecutionPlanV1): boolean {
  const hasPending = plan.steps.some((step) => step.status === "pending");
  if (hasPending) {
    return false;
  }
  return plan.steps.some(
    (step) =>
      step.status === "prepared" ||
      step.status === "ready" ||
      step.status === "waiting_approval" ||
      step.status === "running",
  );
}

/** User approved Pending Reality — plan gate and/or one step Commit gate. */
export function commitContextExecutionPlanFromApproval(input: {
  plan: ContextExecutionPlanV1;
  now?: Date;
}): ContextExecutionPlanV1 {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  let plan = input.plan;

  // Plan gate only — do not treat L5 `waiting_approval` as plan approval.
  if (plan.osPhase === "plan_waiting_approval") {
    plan = startContextExecutionPlanRuntime({ plan, now });
  }

  if (plan.osPhase === "executing") {
    const advanced = completeActiveExecutionPlanStepAndAdvance({ plan, now });
    if (advanced.updatedAtIso !== plan.updatedAtIso || advanced.osPhase !== plan.osPhase) {
      return advanced;
    }
    if (canFinalizeAllPreparedSteps(plan)) {
      return markAllCompletableStepsDone(plan, nowIso);
    }
    return plan;
  }

  if (
    plan.osPhase === "execution_prepared" ||
    plan.osPhase === "waiting_approval"
  ) {
    const advanced = completeActiveExecutionPlanStepAndAdvance({ plan, now });
    if (advanced.osPhase === "committed" || advanced.osPhase === "executing") {
      return advanced;
    }
    if (canFinalizeAllPreparedSteps(plan) || canFinalizeAllPreparedSteps(advanced)) {
      return markAllCompletableStepsDone(
        advanced.updatedAtIso !== plan.updatedAtIso ? advanced : plan,
        nowIso,
      );
    }
    return advanced;
  }

  return plan;
}
