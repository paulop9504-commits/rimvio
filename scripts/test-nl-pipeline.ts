#!/usr/bin/env npx tsx
/**
 * NL Pipeline SSOT — canonical stage order + connected runner + LLM/commit gating.
 */

import assert from "node:assert/strict";
import {
  NL_PIPELINE_STAGES,
  NL_PIPELINE_MANIFEST,
  llmEligibleStages,
  nlPipelineStageMeta,
  realityMutatingStages,
} from "../lib/context-run/natural-language-pipeline";
import {
  assertNlPipelineStageOrder,
  runNaturalLanguagePipeline,
} from "../lib/context-run/run-natural-language-pipeline";
import {
  clearSessionGraphs,
  resetGraphCommandStoreForTests,
} from "../lib/graph-command";
import { clearPreparedRealityOperations } from "../lib/reality-queue";
import { evaluateUtteranceRules } from "../lib/rule-engine";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";
import {
  clearLodgingStayRevisePending,
  readLodgingStayRevisePending,
} from "../lib/globe/context-hub/lodging-stay-revise-pending-store";

assert.deepEqual(
  [...NL_PIPELINE_STAGES],
  [
    "context_builder",
    "rule_constitution",
    "entity_resolver",
    "intent_parser",
    "action_planner",
    "tool_router",
    "graph_command_ir",
    "graph_engine",
    "agent_runtime",
    "reality_commit",
    "reality_graph",
  ],
);

// Context Builder is first; Reality Graph is last.
assert.equal(NL_PIPELINE_STAGES[0], "context_builder");
assert.equal(NL_PIPELINE_STAGES[NL_PIPELINE_STAGES.length - 1], "reality_graph");

// Manifest covers every stage exactly once.
assert.equal(NL_PIPELINE_MANIFEST.length, NL_PIPELINE_STAGES.length);
for (const stage of NL_PIPELINE_STAGES) {
  const meta = nlPipelineStageMeta(stage);
  assert.equal(meta.stage, stage);
  assert.ok(meta.labelKo.length > 0);
  assert.ok(meta.wire.length > 0);
}

// Only reality_commit mutates Reality.
assert.deepEqual([...realityMutatingStages()], ["reality_commit"]);

// LLM eligible must NOT include graph_engine / reality_commit (deterministic).
const llm = new Set(llmEligibleStages());
assert.ok(!llm.has("graph_engine"));
assert.ok(!llm.has("reality_commit"));
assert.ok(!llm.has("context_builder"));

// Compound compare→reserve freezes free-NL + requires Commit gate.
{
  const decision = evaluateUtteranceRules({
    utterance: "APA난바이랑 APA우메다 비교해서 예약해",
  });
  assert.equal(decision.actionMatched, true);
  assert.equal(decision.requiresCommit, true);
  assert.equal(decision.preferActionOverText, true);
}

// Connected runner visits stages in canonical order.
{
  resetGraphCommandStoreForTests();
  clearPreparedRealityOperations();
  clearSessionGraphs();
  const run = runNaturalLanguagePipeline({
    utterance: "APA난바이랑 APA우메다 비교해서 예약해",
    contextEventId: "evt-nl-pipe",
    anchorLat: 34.67,
    anchorLng: 135.5,
    contextLabelKo: "오사카",
  });
  assert.ok(run.result);
  assert.equal(run.result!.via, "action_plan");
  assert.ok(assertNlPipelineStageOrder(run.trace.stagesVisited));
  assert.ok(run.trace.stagesVisited.includes("context_builder"));
  assert.ok(run.trace.stagesVisited.includes("rule_constitution"));
  assert.ok(run.trace.stagesVisited.includes("action_planner"));
  assert.ok(run.trace.stagesVisited.includes("agent_runtime"));
  assert.ok(run.trace.stagesVisited.includes("reality_commit"));
  assert.ok(run.trace.stagesVisited.includes("reality_graph"));
  assert.equal(run.trace.ruleDecision.actionMatched, true);
}

// Rule gate: blocked Reserve with empty graph must not run Graph Engine.
{
  resetGraphCommandStoreForTests();
  clearPreparedRealityOperations();
  clearSessionGraphs();
  const blocked = runNaturalLanguagePipeline({
    utterance: "예약해",
    contextEventId: "evt-rule-block",
  });
  assert.ok(blocked.result);
  assert.ok(
    blocked.result!.via === "rule_blocked" || blocked.result!.via === "clarify",
  );
  assert.ok(!blocked.trace.stagesVisited.includes("graph_engine"));
  assert.ok(!blocked.trace.stagesVisited.includes("action_planner"));
}

// Graph IR: Pin → soft confirm chips (not Field); Delete through pipeline.
{
  resetGraphCommandStoreForTests();
  clearPreparedRealityOperations();
  clearSessionGraphs();
  const pin = runNaturalLanguagePipeline({
    utterance: "APA호텔 고정",
    contextEventId: "evt-pin-del",
    anchorLat: 34.6654,
    anchorLng: 135.5019,
  });
  assert.equal(pin.result?.via, "soft_confirm");
  assert.equal(pin.result?.waitingCommit, false);
  assert.ok(assertNlPipelineStageOrder(pin.trace.stagesVisited));

  const del = runNaturalLanguagePipeline({
    utterance: "APA 난바 삭제해",
    contextEventId: "evt-pin-del",
  });
  // Delete may soft_confirm / clarify — either way Rule ran first; never Field-only.
  assert.ok(del.trace.stagesVisited.includes("rule_constitution"));
  if (del.result) {
    assert.equal(del.result.waitingCommit, false);
  }
}

// Scout defer: Operator handoff (not silent null) — Field scout continues.
{
  const deferred = runNaturalLanguagePipeline({
    utterance: "캡슐호텔 2만원 이하 찾아줘",
    contextEventId: "evt-defer",
  });
  assert.equal(deferred.result?.via, "scout_handoff");
  assert.equal(deferred.trace.deferredToScout, true);
}

// Unknown / unmatched → clarify or reason chips (never silent null).
{
  const unknown = runNaturalLanguagePipeline({
    utterance: "하늘이 파래요",
    contextEventId: "evt-unknown-recover",
  });
  assert.ok(unknown.result);
  assert.ok(
    unknown.result.via === "clarify" || unknown.result.via === "reason",
  );
  if (
    unknown.result.via === "clarify" ||
    unknown.result.via === "reason"
  ) {
    assert.ok((unknown.result.clarifyChips?.length ?? 0) > 0);
  }
}

// Revise Intent → confirm chips (no scout defer, no slot write yet).
{
  clearLodgingStayRevisePending("evt-revise-nl");
  commitEventUpsert({
    id: "evt-revise-nl",
    title: "오사카 여행",
    category: "travel",
    source: "manual",
    lifecycle: "active",
    datetime: "2030-08-01T03:00:00.000Z",
    place: "오사카",
    metadata: {
      feedPlanEnabled: true,
      planWindowEndIso: "2030-08-05T03:00:00.000Z",
      planWindowConfidence: "confirmed",
      planNights: 4,
      contextLodgingGuestCount: 2,
      contextLodgingRoomCount: 1,
    },
  });
  const revise = runNaturalLanguagePipeline({
    utterance: "5박6일로 갈게",
    contextEventId: "evt-revise-nl",
  });
  assert.equal(revise.result?.via, "revise_confirm");
  assert.equal(revise.trace.deferredToScout, undefined);
  assert.ok(revise.trace.stagesVisited.includes("rule_constitution"));
  assert.ok(readLodgingStayRevisePending("evt-revise-nl"));
  if (revise.result?.via === "revise_confirm") {
    assert.ok(revise.result.reviseChips.some((c) => c.value === "apply"));
  }
  clearLodgingStayRevisePending("evt-revise-nl");
}

console.log("ok — nl-pipeline");
