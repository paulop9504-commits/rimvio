#!/usr/bin/env npx tsx
/**
 * Plan step auto-advance — soft engines prefer auto_scout over chips.
 */
import assert from "node:assert/strict";
import { resolvePlanStepAutoAdvance } from "../lib/context-execution/resolve-plan-step-auto-advance";
import type { ContextExecutionPlanV1 } from "../lib/context-execution/types";

function basePlan(
  engineId: ContextExecutionPlanV1["steps"][number]["engineId"],
  labelKo: string,
): ContextExecutionPlanV1 {
  const now = new Date().toISOString();
  return {
    version: 1,
    contextId: "evt-auto",
    goalKo: "테스트",
    osPhase: "executing",
    approval: "approved",
    currentStepId: "step-1",
    steps: [
      {
        stepId: "step-1",
        nodeId: "explore",
        order: 1,
        labelKo,
        engineId,
        status: "running",
        lastError: null,
        updatedAtIso: now,
      },
    ],
    createdAtIso: now,
    updatedAtIso: now,
  };
}

const eatery = resolvePlanStepAutoAdvance({
  plan: basePlan("eatery_search", "맛집"),
  event: null,
});
assert.equal(eatery.kind, "auto_scout");
if (eatery.kind === "auto_scout") {
  assert.equal(eatery.engineId, "eatery_search");
  assert.ok(eatery.seedUtterance.includes("맛집"));
  assert.ok(eatery.progressKo.length > 0);
}

const amenity = resolvePlanStepAutoAdvance({
  plan: basePlan("local_amenity_search", "편의"),
  event: null,
});
assert.equal(amenity.kind, "auto_scout");

console.log("ok: plan-step-auto-advance");
