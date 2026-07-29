/**
 * ADR-041 Five-pillar Agent Spine — Cursor isomorphism.
 * Run: npx tsx scripts/test-rimvio-agent-spine.ts
 */

import assert from "node:assert/strict";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  CURSOR_RIMVIO_PILLAR_MAP,
  RIMVIO_AGENT_SPINE_PILLARS,
  RIMVIO_AGENT_SPINE_SLOGAN,
  formatRimvioAgentSpineBrief,
  readRimvioAgentSpineSnapshot,
  type WorkstreamState,
} from "@/lib/workstream";

assert.equal(CURSOR_RIMVIO_PILLAR_MAP.length, 5);
assert.equal(RIMVIO_AGENT_SPINE_PILLARS.length, 5);
assert.deepEqual([...RIMVIO_AGENT_SPINE_PILLARS], [
  "context_graph",
  "agent_execution_state",
  "reality_timeline",
  "commit_ledger",
  "self_repair_loop",
]);
assert.ok(RIMVIO_AGENT_SPINE_SLOGAN.includes("Prompts are subordinate"));

assert.equal(CURSOR_RIMVIO_PILLAR_MAP[0]?.cursor, "Agent");
assert.equal(CURSOR_RIMVIO_PILLAR_MAP[1]?.rimvio, "Context Graph");
assert.equal(CURSOR_RIMVIO_PILLAR_MAP[4]?.rimvio, "Self Repair Loop");

const event = {
  id: "ctx-spine",
  title: "오사카 여행",
  place: "오사카",
  category: "travel",
  source: "message",
  lifecycle: "active",
  confidence: 0.9,
  metadata: {
    globePlaceLabel: "오사카",
    travelDestination: "오사카",
  },
  lifecycleUpdatedAt: "2026-07-30T00:00:00.000Z",
  createdAt: "2026-07-30T00:00:00.000Z",
  updatedAt: "2026-07-30T00:00:00.000Z",
} as EventCandidate;

// Spine snapshot without browser store still builds Context Graph + Execution State.
const snap = readRimvioAgentSpineSnapshot({
  contextEventId: "ctx-spine",
  event,
});

assert.equal(snap.contextGraph.title.length > 0, true);
assert.ok(snap.agentExecutionState);
assert.ok(Array.isArray(snap.realityTimeline));
assert.ok(typeof snap.commitLedger.completenessPercent === "number");
assert.deepEqual(
  [...snap.selfRepairLoop.stages],
  ["plan", "execute", "observe", "verify", "repair", "commit"],
);

const brief = formatRimvioAgentSpineBrief(snap);
assert.ok(brief.includes("Context Graph"));
assert.ok(brief.includes("Commit Ledger"));
assert.ok(brief.includes("Self Repair"));

// Type-only: WorkstreamState still importable via barrel for consumers.
const _ws: WorkstreamState | null = snap.workstream;
void _ws;

console.log("OK — rimvio-agent-spine");
