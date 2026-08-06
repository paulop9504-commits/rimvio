/**
 * ADR-050 Agent Product Pipeline + Discovery Planner-first.
 * Run: npx tsx scripts/test-agent-product-pipeline.ts
 */

import assert from "node:assert/strict";
import {
  AGENT_PRODUCT_PIPELINE_STAGES,
  advanceAgentProductStage,
  beginAgentProductTurn,
  clearLastAgentProductTurnForTests,
  planObjectDiscovery,
  readLastAgentProductTurn,
  verifyAgentProductStage,
} from "@/lib/context-run";
import { openMapContextWorkspace } from "@/lib/context-workspace/open-map-workspace";
import { clearContextWorkspace } from "@/lib/context-workspace/workspace-store";

clearLastAgentProductTurnForTests();

assert.ok(AGENT_PRODUCT_PIPELINE_STAGES.includes("planner"));
assert.ok(AGENT_PRODUCT_PIPELINE_STAGES.includes("object_discovery"));
assert.equal(AGENT_PRODUCT_PIPELINE_STAGES[0], "intent");

const ctx = "ctx-product-pipeline-1";
clearContextWorkspace(ctx);
openMapContextWorkspace({
  contextEventId: ctx,
  domain: "lodging",
  query: "난바 캡슐호텔",
  summaryKo: "오사카 여행",
  candidates: [
    {
      id: "lodging:osaka:test-a",
      labelKo: "테스트 캡슐",
      rating: 4.5,
      lat: 34.66,
      lng: 135.5,
      source: "seed",
    },
  ],
  source: "scout_patch",
});

const turn = beginAgentProductTurn({
  contextEventId: ctx,
  utterance: "난바역 근처 캡슐호텔 찾아줘",
});
assert.equal(turn.spineEntered, true);
assert.ok(turn.stagesCompleted.includes("intent"));
assert.ok(turn.stagesCompleted.includes("context_resolution"));
assert.equal(readLastAgentProductTurn()?.contextEventId, ctx);

const planned = advanceAgentProductStage(turn, "planner");
assert.ok(planned.stagesCompleted.includes("planner"));

const discoveryPlan = planObjectDiscovery({
  contextEventId: ctx,
  utterance: "난바역 근처 캡슐호텔 찾아줘",
  mode: "replace",
});
assert.ok(discoveryPlan);
assert.equal(discoveryPlan!.domain, "lodging");
assert.ok(discoveryPlan!.toolId.length > 0);
assert.ok(discoveryPlan!.query.length > 0);

const verified = verifyAgentProductStage(planned, "object_discovery", true);
assert.ok(verified.stagesCompleted.includes("object_discovery"));
assert.equal(verified.lastVerifyOk, true);

const failed = verifyAgentProductStage(
  verified,
  "workspace_patch",
  false,
  "patch missing",
);
assert.equal(failed.lastVerifyOk, false);
assert.equal(failed.failedStage, "workspace_patch");

clearContextWorkspace(ctx);
console.log("OK — agent-product-pipeline");
