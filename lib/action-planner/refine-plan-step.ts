/**
 * STEP6 — refine/retry a single plan step when intent drifts.
 * Does not replan the whole chain.
 */

import type { ActionPlanStepV1, ActionPlanV1 } from "@/lib/action-planner/types";
import type { RimvioToolId } from "@/lib/tool-registry";
import { getRimvioTool } from "@/lib/tool-registry";

function patchStep(
  steps: readonly ActionPlanStepV1[],
  stepId: string,
  patch: Partial<ActionPlanStepV1>,
): ActionPlanStepV1[] {
  return steps.map((step) =>
    step.id === stepId ? { ...step, ...patch } : step,
  );
}

/**
 * Reset one step to pending (optionally swap ToolId). Later steps stay as-is
 * unless they were already done — then they remain done (no cascade wipe).
 */
export function refinePlanStep(input: {
  readonly plan: ActionPlanV1;
  readonly stepId: string;
  readonly reasonKo?: string | null;
  readonly nextToolId?: RimvioToolId | null;
}): ActionPlanV1 | null {
  const stepId = input.stepId.trim();
  if (!stepId) {
    return null;
  }
  const target = input.plan.steps.find((step) => step.id === stepId);
  if (!target) {
    return null;
  }

  const nextToolId = input.nextToolId ?? target.toolId;
  const labelKo = nextToolId
    ? (getRimvioTool(nextToolId)?.labelKo ?? target.labelKo)
    : target.labelKo;

  return {
    ...input.plan,
    steps: patchStep(input.plan.steps, stepId, {
      status: "pending",
      toolId: nextToolId,
      labelKo,
      noteKo: input.reasonKo?.trim() || "이 단계만 다시 맞출게요",
    }),
  };
}

/** True when a step failed / blocked and should be refined instead of full replan. */
export function shouldRefinePlanStep(step: ActionPlanStepV1 | null | undefined): boolean {
  return step?.status === "blocked";
}
