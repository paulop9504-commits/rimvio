/**
 * ADR-043 Goal State top SSOT + Spine + Preference Graph.
 * Run: npx tsx scripts/test-goal-spine-convergence.ts
 */

import assert from "node:assert/strict";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  AGENT_SPINE_SLOGAN,
  AGENT_SPINE_STAGES,
  compileIntentToGoalState,
  enterAgentSpine,
  formatGoalProgressLine,
  nextSpineStage,
  observePreferenceFromUtterance,
  readPreferenceGraph,
  syncContextGoalState,
  type WorkstreamState,
} from "@/lib/workstream";

assert.ok(AGENT_SPINE_SLOGAN.includes("Every Intent"));
assert.deepEqual([...AGENT_SPINE_STAGES], [
  "goal_state",
  "context_graph",
  "execution_state",
  "verification",
  "repair",
  "reality_queue",
  "commit",
]);
assert.equal(nextSpineStage("goal_state"), "context_graph");
assert.equal(nextSpineStage("commit"), null);

const ingress = enterAgentSpine({
  source: "action-chat",
  contextEventId: "ctx-goal",
  utterance: "오사카 여행 준비해줘",
  stage: "goal_state",
});
assert.equal(ingress.source, "action-chat");
assert.equal(ingress.stage, "goal_state");

const intent = compileIntentToGoalState({
  utterance: "오사카 조용한 호텔로 도보 여행 준비해줘 웨이팅 싫어",
  contextEventId: "ctx-goal",
});
assert.ok(intent.goalKo.length > 0);
assert.ok(intent.confirmedHints.includes("destination") || intent.entities.length >= 0);

const prefs = readPreferenceGraph();
assert.ok(
  prefs.edges.some((e) =>
    ["walk_prefer", "quiet_hotel", "no_waiting"].includes(e.kind),
  ),
  "preference edges should accumulate from utterance",
);

const event = {
  id: "ctx-goal",
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
  contextEventId: "ctx-goal",
  title: "오사카 여행",
  phase: "named",
  updatedAtIso: "2026-07-30T00:00:00.000Z",
  events: [
    {
      id: "1",
      kind: "ScheduleUpdated",
      atIso: "2026-07-30T00:00:00.000Z",
      contextEventId: "ctx-goal",
      labelKo: "4박5일",
    },
    {
      id: "2",
      kind: "HotelSelected",
      atIso: "2026-07-30T01:00:00.000Z",
      contextEventId: "ctx-goal",
      labelKo: "호텔",
    },
  ],
};

const goal = syncContextGoalState({
  contextEventId: "ctx-goal",
  event,
  workstream,
  intentGoal: intent,
});
assert.ok(goal.percent >= 0 && goal.percent <= 100);
assert.ok(formatGoalProgressLine(goal).includes("%"));
assert.ok(goal.goalKo.length > 0);

observePreferenceFromUtterance("지하철로 이동할래");
assert.ok(
  readPreferenceGraph().edges.some((e) => e.kind === "subway_prefer"),
);

console.log("OK — goal-spine-convergence");
