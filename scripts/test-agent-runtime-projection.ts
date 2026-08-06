/**
 * ADR-050 STEP 6–8 — Runtime Projection + Agent Status work-log.
 * Run: npx tsx scripts/test-agent-runtime-projection.ts
 */

import assert from "node:assert/strict";
import {
  beginAgentProductTurn,
  advanceAgentProductStage,
  clearLastAgentProductTurnForTests,
  writeAgentRuntimeProjectionFromWorkspace,
  readAgentRuntimeProjection,
  clearAgentRuntimeProjectionForTests,
  resolveAgentStatusWorkLog,
  listAgentStatusWorkLogLines,
  subscribeAgentRuntimeProjection,
} from "@/lib/context-run";
import { runAutoProjectionAfterPatch } from "@/lib/context-workspace/auto-projection";
import { openMapContextWorkspace } from "@/lib/context-workspace/open-map-workspace";
import { clearContextWorkspace } from "@/lib/context-workspace/workspace-store";

clearLastAgentProductTurnForTests();
clearAgentRuntimeProjectionForTests();

const ctx = "ctx-runtime-proj-1";
clearContextWorkspace(ctx);
openMapContextWorkspace({
  contextEventId: ctx,
  domain: "lodging",
  query: "난바 캡슐",
  summaryKo: "오사카",
  candidates: [
    {
      id: "lodging:osaka:a",
      labelKo: "캡슐 A",
      rating: 4.6,
      lat: 34.66,
      lng: 135.5,
      source: "seed",
    },
    {
      id: "lodging:osaka:b",
      labelKo: "캡슐 B",
      rating: 4.1,
      lat: 34.67,
      lng: 135.51,
      source: "seed",
    },
  ],
  source: "scout_patch",
});

let turn = beginAgentProductTurn({
  contextEventId: ctx,
  utterance: "난바역 근처 캡슐호텔",
});
turn = advanceAgentProductStage(turn, "planner");
turn = advanceAgentProductStage(turn, "object_discovery");
turn = advanceAgentProductStage(turn, "workspace_patch");

const auto = runAutoProjectionAfterPatch({ contextEventId: ctx });
assert.equal(auto.ok, true);
assert.ok(auto.stages.includes("ui_refresh"));

const proj = readAgentRuntimeProjection(ctx);
assert.ok(proj);
assert.equal(proj!.contextEventId, ctx);
assert.ok(proj!.mapPins.length >= 1);
assert.ok(proj!.calloutFocusIds.length >= 1);
assert.ok(proj!.workLog.length >= 2);
assert.ok(proj!.lastStage === "projection" || proj!.lastStage === "agent_status");

const status = resolveAgentStatusWorkLog({ contextEventId: ctx });
assert.ok(status);
assert.ok(listAgentStatusWorkLogLines(ctx).length >= 2);

const again = writeAgentRuntimeProjectionFromWorkspace({
  contextEventId: ctx,
  preparePending: true,
  commitPending: true,
});
assert.equal(again?.preparePending, true);
assert.equal(again?.commitPending, true);

let notifyCount = 0;
const unsub = subscribeAgentRuntimeProjection(() => {
  notifyCount += 1;
});
writeAgentRuntimeProjectionFromWorkspace({ contextEventId: ctx });
assert.ok(notifyCount >= 1);
unsub();

clearContextWorkspace(ctx);
clearAgentRuntimeProjectionForTests(ctx);
console.log("OK — agent-runtime-projection");
