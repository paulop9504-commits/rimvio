/**
 * Travel-specific Execution Plan patches — mirrors advance-ingress-flow graph patches.
 */

import { buildContextExecutionPlanFromBlueprint } from "@/lib/context-execution/build-context-execution-plan";
import { patchContextExecutionPlanSteps } from "@/lib/context-execution/advance-plan-step";
import type { ContextExecutionPlanV1 } from "@/lib/context-execution/types";
import type { ContextBlueprint } from "@/lib/context-blueprint/types";

export function ensureTravelExecutionPlan(input: {
  blueprint: ContextBlueprint;
  plan?: ContextExecutionPlanV1 | null;
  contextId: string;
}): ContextExecutionPlanV1 | null {
  if (input.plan) {
    return input.plan;
  }
  return buildContextExecutionPlanFromBlueprint({
    blueprint: input.blueprint,
    build: {
      contextId: input.contextId,
      goalKo: input.blueprint.goal,
      osPhase: "execution_planned",
    },
  });
}

/** Destination chip confirm — advance Runtime steps without mutating Blueprint structure. */
export function patchTravelExecutionPlanForDestination(input: {
  blueprint: ContextBlueprint;
  plan?: ContextExecutionPlanV1 | null;
  contextId: string;
}): ContextExecutionPlanV1 | null {
  const base = ensureTravelExecutionPlan(input);
  if (!base) {
    return null;
  }
  // Destination confirm jumps to Stay — mark skipped early legs done so the
  // Cursor-style sequencer can walk stay → explore → return without orphans.
  return patchContextExecutionPlanSteps({
    plan: base,
    patches: [
      { nodeId: "trip", status: "done" },
      { nodeId: "prepare", status: "done" },
      { nodeId: "departure", status: "done" },
      { nodeId: "arrival", status: "done" },
      { nodeId: "stay", status: "running" },
    ],
  });
}
