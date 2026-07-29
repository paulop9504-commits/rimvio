/**
 * ADR-040 Autonomous Context Agent — operating law · Task Graph · Status brief.
 * Run: npx tsx scripts/test-autonomous-context-agent.ts
 */

import assert from "node:assert/strict";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  RIMVIO_AGENT_EXECUTION_LOOP,
  RIMVIO_AGENT_IDENTITY,
  buildAgentExecutionState,
  buildContextTaskGraph,
  buildRimvioAgentPromptHeader,
  classifyRealityEpistemic,
  formatAgentStatusBrief,
  formatTaskGraphBrief,
  nextAgentLoopStage,
  type AgentExecutionSession,
  type WorkstreamState,
} from "@/lib/workstream";

assert.ok(RIMVIO_AGENT_IDENTITY.includes("Autonomous Context Agent"));
assert.deepEqual(
  [...RIMVIO_AGENT_EXECUTION_LOOP],
  ["plan", "execute", "observe", "verify", "repair", "commit"],
);
assert.equal(nextAgentLoopStage("plan"), "execute");
assert.equal(nextAgentLoopStage("commit"), null);

assert.equal(
  classifyRealityEpistemic({ realityCommitted: true }),
  "confirmed",
);
assert.equal(
  classifyRealityEpistemic({ fromExternalData: true }),
  "observed",
);
assert.equal(
  classifyRealityEpistemic({ isRecommendation: true }),
  "suggested",
);
assert.equal(classifyRealityEpistemic({}), "inferred");

const header = buildRimvioAgentPromptHeader();
assert.ok(header.includes("ADR-040"));
assert.ok(header.includes("Confirmed is sacred"));

const event = {
  id: "ctx-agent-law",
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

const workstream: WorkstreamState = {
  contextEventId: "ctx-agent-law",
  title: "오사카 여행",
  phase: "named",
  updatedAtIso: "2026-07-30T00:00:00.000Z",
  events: [
    {
      id: "1",
      kind: "ScheduleUpdated",
      atIso: "2026-07-30T00:00:00.000Z",
      contextEventId: "ctx-agent-law",
      labelKo: "4박5일",
    },
    {
      id: "2",
      kind: "HotelSelected",
      atIso: "2026-07-30T01:00:00.000Z",
      contextEventId: "ctx-agent-law",
      labelKo: "호텔 연결",
    },
  ],
};

const graph = buildContextTaskGraph({
  contextEventId: "ctx-agent-law",
  event,
  workstream,
});
assert.ok(graph.goalKo.includes("오사카"));
assert.equal(graph.tasks.length, 6);
assert.equal(graph.tasks[0]?.status, "done");
assert.equal(graph.tasks[1]?.status, "done");
const brief = formatTaskGraphBrief(graph);
assert.ok(brief.includes("Goal:"));
assert.ok(brief.includes("숙소 Context"));

const session: AgentExecutionSession = {
  contextEventId: "ctx-agent-law",
  headlineKo: "일정 최적화",
  statusHint: "healing",
  steps: [
    {
      id: "h1",
      labelKo: "일정 재배치 완료",
      status: "healed",
    },
  ],
  nextHints: ["맛집 후보 생성", "예약 가능 여부 확인"],
  commitStatus: "none",
  errorState: { messageKo: "호텔 이동 시간 충돌 발견" },
  recoveryPlan: [{ labelKo: "일정 재배치 완료" }],
  healEntries: [
    {
      id: "he1",
      atIso: "2026-07-30T02:00:00.000Z",
      labelKo: "호텔 이동 시간 충돌 발견",
    },
  ],
  updatedAtIso: "2026-07-30T02:00:00.000Z",
};

const state = buildAgentExecutionState({
  contextEventId: "ctx-agent-law",
  event,
  workstream,
  session,
});
assert.equal(state.status, "healing");
assert.ok(state.autoResolved.length >= 1);

const statusBrief = formatAgentStatusBrief(state);
assert.ok(statusBrief.includes("[Agent Status]"));
assert.ok(statusBrief.includes("Completed:") || statusBrief.includes("✓"));
assert.ok(statusBrief.includes("Issue:"));
assert.ok(statusBrief.includes("Resolution:") || statusBrief.includes("자동 처리"));

console.log("OK — autonomous-context-agent");
