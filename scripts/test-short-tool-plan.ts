#!/usr/bin/env npx tsx
/**
 * STEP6 — short ToolId plan + single-step refine.
 */

import assert from "node:assert/strict";
import {
  draftShortToolPlan,
  formatShortToolPlanPreviewKo,
  refinePlanStep,
  shouldRefinePlanStep,
} from "../lib/action-planner";

{
  const plan = draftShortToolPlan({
    utterance: "오사카 캡슐호텔 찾아줘",
    contextEventId: "ev-plan-1",
  });
  assert.ok(plan);
  assert.equal(plan!.planKind, "short_tool");
  assert.ok(plan!.steps.length >= 2 && plan!.steps.length <= 5);
  assert.equal(plan!.steps[0]?.toolId, "hotel.lookup");
  assert.ok(plan!.steps.some((s) => s.toolId === "ranking.pick"));
  assert.match(formatShortToolPlanPreviewKo(plan!), /숙소 찾기/);
}

{
  const plan = draftShortToolPlan({
    utterance: "이걸로 예약",
    contextEventId: "ev-plan-2",
    intent: "Reserve",
  });
  assert.ok(plan);
  assert.ok(plan!.steps.some((s) => s.toolId === "booking.prepare"));
  assert.ok(plan!.requiresFieldCommit);
  assert.ok(plan!.steps.some((s) => s.kind === "wait_commit"));
}

{
  const plan = draftShortToolPlan({
    utterance: "오사카 숙소",
    contextEventId: "ev-plan-3",
  })!;
  const blocked = {
    ...plan,
    steps: plan.steps.map((step, index) =>
      index === 0 ? { ...step, status: "blocked" as const } : step,
    ),
  };
  assert.equal(shouldRefinePlanStep(blocked.steps[0]), true);
  const refined = refinePlanStep({
    plan: blocked,
    stepId: blocked.steps[0]!.id,
    reasonKo: "도메인만 다시",
    nextToolId: "restaurant.lookup",
  });
  assert.ok(refined);
  assert.equal(refined!.steps[0]?.status, "pending");
  assert.equal(refined!.steps[0]?.toolId, "restaurant.lookup");
  assert.equal(refined!.steps[1]?.status, plan.steps[1]?.status);
}

console.log("test-short-tool-plan: ok");
