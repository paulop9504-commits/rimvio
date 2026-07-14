#!/usr/bin/env npx tsx
/**
 * Intent Execution Timeline — AgentStage → lane UI snapshot.
 */

import assert from "node:assert/strict";
import {
  buildIntentExecutionTimeline,
  isTripReviseUtterance,
  stageProgressKo,
  TRIP_REVISE_STAGE_PIPELINE,
} from "../lib/intent-engine";

assert.equal(isTripReviseUtterance("일본 여행 수정해줘"), true);
assert.equal(isTripReviseUtterance("신혼 여행가려고"), false);

{
  const snap = buildIntentExecutionTimeline({
    currentStage: "UNDERSTAND_INTENT",
    profile: "trip_revise",
  });
  assert.equal(snap.lanes[0]?.status, "in_progress");
  assert.match(snap.lanes[0]?.detailKo ?? "", /이해/);
  assert.equal(snap.lanes[1]?.status, "pending");
}

{
  const snap = buildIntentExecutionTimeline({
    currentStage: "ANALYZE",
    profile: "trip_revise",
  });
  assert.equal(snap.lanes.find((l) => l.id === "intent")?.status, "done");
  assert.equal(snap.lanes.find((l) => l.id === "context")?.status, "done");
  assert.equal(snap.lanes.find((l) => l.id === "analysis")?.status, "in_progress");
  assert.match(snap.lanes.find((l) => l.id === "analysis")?.detailKo ?? "", /분석/);
  assert.equal(snap.lanes.find((l) => l.id === "planner")?.status, "pending");
}

{
  const snap = buildIntentExecutionTimeline({
    currentStage: "WAIT_APPROVAL",
    profile: "trip_revise",
  });
  assert.equal(snap.lanes.find((l) => l.id === "agent")?.status, "done");
  const reality = snap.lanes.find((l) => l.id === "reality_diff");
  assert.equal(reality?.status, "waiting");
  assert.match(reality?.detailKo ?? "", /승인/);
}

{
  const snap = buildIntentExecutionTimeline({
    currentStage: "COMPLETE",
    profile: "trip_revise",
  });
  assert.ok(snap.lanes.every((l) => l.status === "done"));
}

for (const stage of TRIP_REVISE_STAGE_PIPELINE) {
  assert.ok(stageProgressKo(stage).length > 0, `progress for ${stage}`);
}

console.log("✓ intent execution timeline (stages · trip revise)");
