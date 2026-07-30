/**
 * ADR-045 — One Agent Runtime facade.
 * Run: npx tsx scripts/test-rimvio-agent-runtime.ts
 */

import assert from "node:assert/strict";
import {
  AGENT_CAPABILITY_IDS,
  RIMVIO_AGENT_RUNTIME_LOOP,
  RIMVIO_AGENT_RUNTIME_STAGES,
  clearAgentRuntimeEventLogForTests,
  clearAgentRuntimeMetricsForTests,
  clearLastRimvioAgentRuntimeTurnForTests,
  enterRimvioAgentRuntime,
  formatAgentMemoryBrief,
  listAgentCapabilities,
  publishAgentRuntimeEvent,
  readAgentMemory,
  readAgentRuntimeEventLog,
  readLastRimvioAgentRuntimeTurn,
  summarizeAgentRuntimeMetrics,
} from "@/lib/workstream";

clearLastRimvioAgentRuntimeTurnForTests();
clearAgentRuntimeEventLogForTests();
clearAgentRuntimeMetricsForTests();

assert.ok(RIMVIO_AGENT_RUNTIME_STAGES.includes("judge"));
assert.ok(RIMVIO_AGENT_RUNTIME_LOOP.includes("verify"));
assert.ok(listAgentCapabilities().length >= AGENT_CAPABILITY_IDS.length - 1);

const turn = enterRimvioAgentRuntime({
  source: "action-chat",
  contextEventId: "ctx-runtime-1",
  utterance: "제주도 여행",
});
assert.equal(turn.ingress.source, "action-chat");
assert.equal(turn.judgment?.strategy.strategy, "planning");
assert.ok(turn.memory);
assert.ok(turn.brain);
assert.ok(turn.health.overall > 0);
assert.equal(readLastRimvioAgentRuntimeTurn()?.ingress.contextEventId, "ctx-runtime-1");

const memory = readAgentMemory({ contextEventId: "ctx-runtime-1" });
assert.ok(formatAgentMemoryBrief(memory).includes("Agent Memory"));

publishAgentRuntimeEvent({
  kind: "hotel_selected",
  contextEventId: "ctx-runtime-1",
  labelKo: "호텔 선택",
});
assert.ok(
  readAgentRuntimeEventLog({ contextEventId: "ctx-runtime-1" }).some(
    (e) => e.kind === "hotel_selected" || e.kind === "intent_received",
  ),
);

const metrics = summarizeAgentRuntimeMetrics("ctx-runtime-1");
assert.ok(metrics.planningMs >= 0 || metrics.totalMs >= 0);

const lookup = enterRimvioAgentRuntime({
  source: "context-run",
  contextEventId: "ctx-runtime-2",
  utterance: "오늘 비와?",
});
assert.equal(lookup.judgment?.strategy.strategy, "lookup");

console.log("OK — rimvio-agent-runtime");
