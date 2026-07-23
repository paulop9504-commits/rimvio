#!/usr/bin/env npx tsx
/**
 * Phase D / M1 — non-compound Search publishes short ToolId plan to Action Plan UI.
 */

import assert from "node:assert/strict";
import {
  clearActionPlanUi,
  publishShortToolPlanPreview,
  readActionPlanUi,
  shouldDraftShortToolPlan,
} from "../lib/action-planner";
import {
  clearSessionGraphs,
  resetGraphCommandStoreForTests,
} from "../lib/graph-command";
import { runNaturalLanguagePipeline } from "../lib/context-run/run-natural-language-pipeline";
import { clearPreparedRealityOperations } from "../lib/reality-queue";

resetGraphCommandStoreForTests();
clearPreparedRealityOperations();
clearSessionGraphs();
clearActionPlanUi();

assert.equal(shouldDraftShortToolPlan("캡슐호텔 찾아줘"), true);
assert.equal(shouldDraftShortToolPlan("APA랑 나인아워 비교하고 예약"), false);
assert.equal(shouldDraftShortToolPlan("안녕"), false);
assert.equal(shouldDraftShortToolPlan("근처 맛집"), true);
assert.equal(shouldDraftShortToolPlan("APA호텔 고정"), false);
assert.equal(shouldDraftShortToolPlan("APA 삭제해"), false);

{
  const plan = publishShortToolPlanPreview({
    utterance: "오사카 캡슐호텔 찾아줘",
    contextEventId: "ctx-short-plan-m1",
  });
  assert.ok(plan);
  assert.equal(plan!.planKind, "short_tool");
  assert.ok(plan!.steps.length >= 2 && plan!.steps.length <= 5);
  assert.equal(plan!.steps[0]?.toolId, "hotel.lookup");
  assert.equal(readActionPlanUi()?.planId, plan!.planId);
}

clearActionPlanUi();
clearSessionGraphs();

{
  const run = runNaturalLanguagePipeline({
    utterance: "캡슐호텔 찾아줘",
    contextEventId: "ctx-nl-short-m1",
    anchorLat: 34.67,
    anchorLng: 135.5,
    contextLabelKo: "오사카",
  });
  assert.ok(run.result);
  assert.ok(
    run.trace.stagesVisited.includes("action_planner"),
    `expected action_planner in ${run.trace.stagesVisited.join(",")}`,
  );
  const ui = readActionPlanUi();
  assert.ok(ui, "Action Plan card store must be filled on Search turn");
  assert.equal(ui!.planKind, "short_tool");
  assert.ok(ui!.steps.some((s) => s.toolId === "hotel.lookup"));
  if (run.result && "actionPlan" in run.result && run.result.actionPlan) {
    assert.equal(run.result.actionPlan.planKind, "short_tool");
  }
}

console.log("test-short-plan-nl-wire: ok");
