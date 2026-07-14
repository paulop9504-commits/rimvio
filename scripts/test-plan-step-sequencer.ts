#!/usr/bin/env npx tsx
/**
 * Cursor-style Execution Plan walk: stay prepared → approve → explore running
 * → prepared → approve → return → … → committed + handoff chips for next engine.
 */

import assert from "node:assert/strict";
import { composeTravelTripBlueprint } from "../lib/context-blueprint/examples/travel-trip-execution-graph";
import {
  advanceContextExecutionPlanStep,
  buildContextExecutionPlanFromBlueprint,
  commitContextExecutionPlanFromApproval,
  completeActiveExecutionPlanStepAndAdvance,
  needsContextExecutionAnyApproval,
  needsContextExecutionStepApproval,
  patchTravelExecutionPlanForDestination,
  preferFresherExecutionPlan,
  resolvePlanStepHandoffOffer,
  resolveScheduledEngineIdFromExecutionPlan,
} from "../lib/context-execution";
import { planRimvioEngineTurn } from "../lib/engine/engine-registry";
import type { EventCandidate } from "../lib/events/event-candidate";

const blueprint = composeTravelTripBlueprint({
  contextId: "ctx-seq",
  bridgeId: "bridge-seq",
  runtimeId: "runtime-seq",
  goal: "오사카 3박",
});

const built = buildContextExecutionPlanFromBlueprint({
  blueprint,
  build: {
    contextId: "evt-seq",
    goalKo: "오사카 3박",
    osPhase: "executing",
    approval: "approved",
  },
});
assert.ok(built);

let plan = patchTravelExecutionPlanForDestination({
  blueprint,
  plan: built,
  contextId: "evt-seq",
})!;
assert.ok(plan);

const departure = plan.steps.find((step) => step.nodeId === "departure");
const arrival = plan.steps.find((step) => step.nodeId === "arrival");
const stay = plan.steps.find((step) => step.nodeId === "stay");
assert.equal(departure?.status, "done");
assert.equal(arrival?.status, "done");
assert.equal(stay?.status, "running");

plan = advanceContextExecutionPlanStep({
  plan,
  nodeId: "stay",
  status: "prepared",
});
assert.equal(plan.steps.find((step) => step.nodeId === "stay")?.status, "prepared");

plan = commitContextExecutionPlanFromApproval({
  plan,
  now: new Date("2026-07-14T12:00:00.000Z"),
});
assert.equal(plan.osPhase, "executing");
assert.equal(plan.steps.find((step) => step.nodeId === "stay")?.status, "done");
assert.equal(plan.steps.find((step) => step.nodeId === "explore")?.status, "running");
assert.equal(plan.steps.find((step) => step.nodeId === "explore")?.engineId, "eatery_search");

const handoff = resolvePlanStepHandoffOffer(plan);
assert.ok(handoff);
assert.equal(handoff!.engineId, "eatery_search");
assert.ok(handoff!.chips.some((chip) => chip.labelKo.includes("맛집")));

plan = advanceContextExecutionPlanStep({
  plan,
  nodeId: "explore",
  status: "prepared",
});
plan = completeActiveExecutionPlanStepAndAdvance({
  plan,
  now: new Date("2026-07-14T13:00:00.000Z"),
});
assert.equal(plan.steps.find((step) => step.nodeId === "explore")?.status, "done");
assert.equal(plan.steps.find((step) => step.nodeId === "return")?.status, "running");

plan = advanceContextExecutionPlanStep({
  plan,
  nodeId: "return",
  status: "prepared",
});
plan = commitContextExecutionPlanFromApproval({
  plan,
  now: new Date("2026-07-14T14:00:00.000Z"),
});
assert.equal(plan.osPhase, "committed");
assert.ok(plan.steps.every((step) => step.status === "done" || step.status === "blocked"));

const singlePrepared = commitContextExecutionPlanFromApproval({
  plan: {
    version: 1,
    contextId: "ctx-1",
    goalKo: "오사카",
    osPhase: "waiting_approval",
    approval: "pending",
    steps: [
      {
        stepId: "s1",
        nodeId: "n1",
        order: 0,
        labelKo: "숙소 확정",
        engineId: "lodging_search",
        status: "prepared",
        lastError: null,
        updatedAtIso: "2026-07-11T00:00:00.000Z",
      },
    ],
    currentStepId: "s1",
    createdAtIso: "2026-07-11T00:00:00.000Z",
    updatedAtIso: "2026-07-11T00:00:00.000Z",
  },
  now: new Date("2026-07-11T01:00:00.000Z"),
});
assert.equal(singlePrepared.osPhase, "committed");
assert.equal(singlePrepared.steps[0]?.status, "done");

// Plan schedules Engine — explore:running prefers eatery; soft continue uses seed;
// clear lodging pivot still overrides.
let explorePlan = patchTravelExecutionPlanForDestination({
  blueprint,
  plan: built,
  contextId: "evt-seq-sched",
})!;
explorePlan = advanceContextExecutionPlanStep({
  plan: explorePlan,
  nodeId: "stay",
  status: "prepared",
});
explorePlan = commitContextExecutionPlanFromApproval({
  plan: explorePlan,
  now: new Date("2026-07-14T15:00:00.000Z"),
});
assert.equal(
  resolveScheduledEngineIdFromExecutionPlan(explorePlan),
  "eatery_search",
);

const scheduledEvent = {
  id: "evt-seq-sched",
  title: "오사카",
  category: "travel",
  source: "chat",
  lifecycle: "active",
  datetime: null,
  place: "오사카",
  confidence: 0.9,
  metadata: {
    contextExecutionPlanV1: explorePlan,
  },
  lifecycleUpdatedAt: "2026-07-14T15:00:00.000Z",
  createdAt: "2026-07-14T15:00:00.000Z",
  updatedAt: "2026-07-14T15:00:00.000Z",
} as EventCandidate;

const eateryTurn = planRimvioEngineTurn({
  message: "주변 맛집 찾아줘",
  event: scheduledEvent,
});
assert.equal(eateryTurn?.engineId, "eatery_search");

const softContinue = planRimvioEngineTurn({
  message: "다음",
  event: scheduledEvent,
});
assert.equal(softContinue?.engineId, "eatery_search");

const pivotLodging = planRimvioEngineTurn({
  message: "부산 서면쪽 숙소 예약 준비해",
  event: scheduledEvent,
});
assert.equal(pivotLodging?.engineId, "lodging_search");

// Step approval gate — CTA while stay is prepared; not while next is only running.
assert.equal(needsContextExecutionStepApproval(explorePlan), false);
let preparedStay = patchTravelExecutionPlanForDestination({
  blueprint,
  plan: built,
  contextId: "evt-step-gate",
})!;
preparedStay = advanceContextExecutionPlanStep({
  plan: preparedStay,
  nodeId: "stay",
  status: "prepared",
});
assert.equal(needsContextExecutionStepApproval(preparedStay), true);
assert.equal(needsContextExecutionAnyApproval(preparedStay), true);

// prepared → approve → done → next running (never complete bare running)
const runningOnly = patchTravelExecutionPlanForDestination({
  blueprint,
  plan: built,
  contextId: "evt-running-only",
})!;
assert.equal(runningOnly.steps.find((s) => s.nodeId === "stay")?.status, "running");
const noopOnRunning = completeActiveExecutionPlanStepAndAdvance({
  plan: runningOnly,
  now: new Date("2026-07-14T16:00:00.000Z"),
});
assert.equal(noopOnRunning.steps.find((s) => s.nodeId === "stay")?.status, "running");
assert.equal(noopOnRunning.updatedAtIso, runningOnly.updatedAtIso);

const afterPrepare = advanceContextExecutionPlanStep({
  plan: runningOnly,
  nodeId: "stay",
  status: "prepared",
});
const walked = completeActiveExecutionPlanStepAndAdvance({
  plan: afterPrepare,
  now: new Date("2026-07-14T16:01:00.000Z"),
});
assert.equal(walked.steps.find((s) => s.nodeId === "stay")?.status, "done");
assert.equal(walked.steps.find((s) => s.nodeId === "explore")?.status, "running");

const stale = { ...afterPrepare, updatedAtIso: "2026-07-14T10:00:00.000Z" };
const fresh = preferFresherExecutionPlan(stale, walked);
assert.equal(fresh?.updatedAtIso, walked.updatedAtIso);

console.log("✓ plan-step-sequencer prepared→done→next running");


