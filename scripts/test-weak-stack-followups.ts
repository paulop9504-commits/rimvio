#!/usr/bin/env npx tsx
/**
 * Weak-stack follow-ups: pharmacy.lookup · planner compounds · tool route.
 */

import assert from "node:assert/strict";
import {
  buildActionPlan,
  buildSearchReserveActionPlan,
  buildReviseResearchActionPlan,
  isCompoundActionUtterance,
  tryRunActionPlanner,
} from "../lib/action-planner";
import {
  clearSessionGraphs,
  resetGraphCommandStoreForTests,
} from "../lib/graph-command";
import { clearPreparedRealityOperations } from "../lib/reality-queue";
import {
  getRimvioTool,
  invokeRimvioTool,
} from "../lib/tool-registry";
import {
  resolveToolIdForIntent,
  resolveLookupToolId,
} from "../lib/rule-engine";
import { clearLastContextPack } from "../lib/context-builder";

resetGraphCommandStoreForTests();
clearPreparedRealityOperations();
clearSessionGraphs();

assert.ok(getRimvioTool("pharmacy.lookup"));
assert.equal(resolveLookupToolId("amenity"), "pharmacy.lookup");
assert.equal(
  resolveToolIdForIntent({ intent: "Search", domain: "poi", query: "근처 약국" }),
  "pharmacy.lookup",
);

{
  const result = invokeRimvioTool("pharmacy.lookup", {
    query: "약국",
    lat: 34.67,
    lng: 135.5,
    utterance: "주변 약국 찾아줘",
  });
  assert.ok((result.candidates?.length ?? 0) >= 1);
  assert.match(result.summaryKo, /약국|편의/);
}

assert.equal(isCompoundActionUtterance("숙소 찾아서 예약해"), true);
assert.equal(
  isCompoundActionUtterance("일정 바꾸고 다시 찾아줘"),
  true,
);
assert.equal(isCompoundActionUtterance("A호텔이랑 B호텔 비교해서 예약해"), true);

{
  const plan = buildSearchReserveActionPlan({
    utterance: "오사카 숙소 찾아서 예약 준비해",
    contextEventId: "evt-sr",
  });
  assert.ok(plan);
  assert.equal(plan!.planKind, "search_reserve");
  assert.equal(plan!.requiresFieldCommit, true);
  assert.ok(plan!.steps.some((s) => s.kind === "wait_commit"));
}

{
  const plan = buildReviseResearchActionPlan({
    utterance: "하루 늘리고 다시 찾아줘",
    contextEventId: "evt-rr",
  });
  assert.ok(plan);
  assert.equal(plan!.planKind, "revise_research");
  assert.equal(plan!.requiresFieldCommit, false);
}

{
  clearLastContextPack("evt-sr-run");
  clearSessionGraphs();
  const run = tryRunActionPlanner({
    utterance: "APA 난바 찾아서 예약해",
    contextEventId: "evt-sr-run",
    anchorLat: 34.67,
    anchorLng: 135.5,
    contextLabelKo: "오사카",
  });
  assert.ok(run);
  assert.equal(run!.plan.planKind, "search_reserve");
  assert.equal(run!.waitingCommit, true);
  assert.ok(run!.reservedOpIds.length >= 1);
}

{
  const run = tryRunActionPlanner({
    utterance: "인원 바꾸고 다시 찾아줘",
    contextEventId: "evt-rr-run",
    anchorLat: 34.67,
    anchorLng: 135.5,
  });
  assert.ok(run);
  assert.equal(run!.plan.planKind, "revise_research");
  assert.equal(run!.waitingCommit, false);
  assert.equal(run!.reservedOpIds.length, 0);
}

{
  const plan = buildActionPlan({
    utterance: "APA난바이랑 APA우메다 비교해서 예약해",
    contextEventId: "evt-cr",
  });
  assert.equal(plan?.planKind, "compare_reserve");
}

console.log("ok — weak-stack-followups");
