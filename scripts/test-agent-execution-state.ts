/**
 * ADR-039 Reality IDE — Agent Execution State + self-heal plan.
 * Run: npx tsx scripts/test-agent-execution-state.ts
 */

import assert from "node:assert/strict";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  AGENT_EXECUTION_STATUS_LABEL_KO,
  buildAgentExecutionState,
  buildHealingPlanForScheduleConflict,
  formatTimelineClock,
  type AgentExecutionSession,
  type WorkstreamState,
} from "@/lib/workstream";

const event = {
  id: "ctx-osaka-exec",
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
  contextEventId: "ctx-osaka-exec",
  title: "오사카 여행",
  phase: "named",
  updatedAtIso: "2026-07-30T10:34:00.000Z",
  events: [
    {
      id: "e1",
      kind: "ScheduleUpdated",
      atIso: "2026-07-30T10:33:00.000Z",
      contextEventId: "ctx-osaka-exec",
      labelKo: "Timeline 생성",
    },
    {
      id: "e2",
      kind: "HotelCommitted",
      atIso: "2026-07-30T10:32:00.000Z",
      contextEventId: "ctx-osaka-exec",
      labelKo: "호텔 예약 Context 감지",
    },
  ],
};

const session: AgentExecutionSession = {
  contextEventId: "ctx-osaka-exec",
  headlineKo: "주변 일정 분석 중",
  statusHint: "running",
  steps: [
    {
      id: "s1",
      labelKo: "여행 목적지 확인",
      status: "done",
      atIso: "2026-07-30T10:30:00.000Z",
    },
    {
      id: "s2",
      labelKo: "주변 일정 분석",
      status: "running",
      atIso: "2026-07-30T10:34:00.000Z",
    },
  ],
  nextHints: ["이동 동선 최적화", "맛집 후보 생성"],
  commitStatus: "none",
  errorState: null,
  recoveryPlan: null,
  healEntries: [],
  updatedAtIso: "2026-07-30T10:34:00.000Z",
};

const state = buildAgentExecutionState({
  contextEventId: "ctx-osaka-exec",
  event,
  workstream,
  session,
});

assert.equal(state.currentTaskKo, "오사카 여행");
assert.equal(state.liveHeadlineKo, "주변 일정 분석 중");
assert.equal(state.runningStep?.labelKo, "주변 일정 분석");
assert.ok(state.completedSteps.some((s) => s.labelKo === "여행 목적지 확인"));
assert.deepEqual(
  state.nextSteps.map((s) => s.labelKo),
  ["이동 동선 최적화", "맛집 후보 생성"],
);
assert.ok(Array.isArray(state.autoResolved));
assert.ok(state.timeline.length >= 2);
assert.equal(state.timeline[0]?.labelKo, "호텔 예약 Context 감지");
assert.equal(formatTimelineClock("2026-07-30T10:32:00.000Z").length >= 4, true);
assert.ok(AGENT_EXECUTION_STATUS_LABEL_KO.building);

const heal = buildHealingPlanForScheduleConflict();
assert.ok(heal.problemKo.includes("충돌"));
assert.equal(heal.recoveryPlan.length, 3);

const healingSession: AgentExecutionSession = {
  ...session,
  statusHint: "healing",
  errorState: { messageKo: heal.problemKo },
  recoveryPlan: heal.recoveryPlan.map((labelKo) => ({ labelKo })),
};
const healing = buildAgentExecutionState({
  contextEventId: "ctx-osaka-exec",
  event,
  workstream,
  session: healingSession,
});
assert.equal(healing.status, "healing");
assert.ok(healing.recoveryPlan?.length === 3);

console.log("OK — agent-execution-state");
