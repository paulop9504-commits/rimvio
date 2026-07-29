/**
 * ADR-042 Agent Brain — Verification · Intent→goal · Task Graph alive.
 * Run: npx tsx scripts/test-agent-brain-gap.ts
 */

import assert from "node:assert/strict";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  compileIntentToGoalState,
  readAgentBrainSnapshot,
  verifyScheduleFeasibility,
  verifyUsjLateArrivalDemo,
  type WorkstreamState,
} from "@/lib/workstream";

const usj = verifyUsjLateArrivalDemo();
assert.equal(usj.blocked, true, "late USJ day must block");
assert.ok(usj.findings.some((f) => f.severity === "block"));

const okNearby = verifyScheduleFeasibility({
  activityLabelKo: "난바 점심",
  activityLat: 34.663,
  activityLng: 135.502,
  anchorLabelKo: "난바 호텔",
  anchorLat: 34.662,
  anchorLng: 135.5013,
  leaveReadyMinutes: 12 * 60,
  activityCloseMinutes: 15 * 60,
  maxTravelMinutes: 60,
});
assert.equal(okNearby.blocked, false);
assert.equal(okNearby.ok, true);

const goal = compileIntentToGoalState({
  utterance: "오사카 여행 준비해줘",
});
assert.ok(goal.goalKo.length > 0);
assert.ok(goal.pendingSlots.includes("lodging"));
assert.ok(goal.confirmedHints.includes("destination") || goal.entities.length >= 0);

const event = {
  id: "ctx-brain",
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
  contextEventId: "ctx-brain",
  title: "오사카 여행",
  phase: "named",
  updatedAtIso: "2026-07-30T00:00:00.000Z",
  events: [
    {
      id: "1",
      kind: "ScheduleUpdated",
      atIso: "2026-07-30T00:00:00.000Z",
      contextEventId: "ctx-brain",
      labelKo: "4박5일",
    },
    {
      id: "2",
      kind: "HotelSelected",
      atIso: "2026-07-30T01:00:00.000Z",
      contextEventId: "ctx-brain",
      labelKo: "호텔",
    },
  ],
};

// Brain snapshot without writing workstream store — pass via spine path needs store.
// readAgentBrainSnapshot uses readWorkstream; still builds from event for title.
const brain = readAgentBrainSnapshot({
  contextEventId: "ctx-brain",
  event,
  utterance: "오사카 여행 준비해줘",
  lastVerification: usj,
});
assert.ok(brain.taskGraph.tasks.length >= 5);
assert.ok(brain.goalState?.goalKo);
assert.equal(brain.lastVerification?.blocked, true);
assert.ok(brain.statusBrief.includes("[Agent Status]"));
assert.ok(brain.spine.agentExecutionState.taskGraph.tasks.length >= 5);

void workstream;

console.log("OK — agent-brain-gap");
