/**
 * Execution Plan approval gate — plan_waiting_approval before Runtime,
 * plus per-step Commit while executing (Cursor-style approval loop).
 */

import type { ContextBlueprint } from "@/lib/context-blueprint/types";
import type { ContextExecutionPlanV1 } from "@/lib/context-execution/types";

export function blueprintRequiresExecutionPlanApproval(
  blueprint: ContextBlueprint | null | undefined,
): boolean {
  if (!blueprint?.executionGraph?.nodes.length) {
    return false;
  }
  return (
    blueprint.approvalPolicy === "manual" || blueprint.approvalPolicy === "multi_step"
  );
}

export function needsContextExecutionPlanApproval(
  plan: ContextExecutionPlanV1 | null | undefined,
): boolean {
  if (!plan) {
    return false;
  }
  return plan.osPhase === "plan_waiting_approval";
}

const STEP_APPROVAL_STATUSES = new Set([
  "prepared",
  "waiting_approval",
  "ready",
]);

/** True when Runtime has a prepared step waiting for one-tap Commit. */
export function needsContextExecutionStepApproval(
  plan: ContextExecutionPlanV1 | null | undefined,
): boolean {
  if (!plan) {
    return false;
  }
  if (
    plan.osPhase !== "executing" &&
    plan.osPhase !== "execution_prepared" &&
    plan.osPhase !== "waiting_approval"
  ) {
    return false;
  }
  return plan.steps.some((step) => STEP_APPROVAL_STATUSES.has(step.status));
}

/** Plan gate or step gate — Hub CTA visibility. */
export function needsContextExecutionAnyApproval(
  plan: ContextExecutionPlanV1 | null | undefined,
): boolean {
  return (
    needsContextExecutionPlanApproval(plan) ||
    needsContextExecutionStepApproval(plan)
  );
}

export function gateContextExecutionPlanForUserApproval(input: {
  plan: ContextExecutionPlanV1;
  now?: Date;
}): ContextExecutionPlanV1 {
  const nowIso = (input.now ?? new Date()).toISOString();
  return {
    ...input.plan,
    osPhase: "plan_waiting_approval",
    approval: "pending",
    updatedAtIso: nowIso,
  };
}

/** Apply Blueprint approvalPolicy when composing Plan for surface. */
export function resolveContextExecutionPlanApprovalGate(input: {
  plan: ContextExecutionPlanV1 | null;
  blueprint: ContextBlueprint | null | undefined;
}): ContextExecutionPlanV1 | null {
  if (!input.plan) {
    return null;
  }
  if (!blueprintRequiresExecutionPlanApproval(input.blueprint)) {
    return input.plan;
  }
  if (input.plan.approval === "approved" || input.plan.osPhase === "executing") {
    return input.plan;
  }
  if (needsContextExecutionPlanApproval(input.plan)) {
    return input.plan;
  }
  return gateContextExecutionPlanForUserApproval({ plan: input.plan });
}
