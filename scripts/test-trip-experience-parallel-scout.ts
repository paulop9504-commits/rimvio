import assert from "node:assert/strict";
import type { ContextConditionAnchorPinOutcome } from "../lib/globe/context-condition-ai";
import { gateOperatorTurnSync } from "../lib/globe/operator-turn/gate-operator-turn";
import type { OperatorTurnSsot } from "../lib/globe/operator-turn/types";
import type { EventCandidate } from "../lib/events/event-candidate";
import { buildTripExperienceParallelScouts } from "../lib/globe/trip-experience/build-trip-experience-parallel-scouts";
import { mergeTripExperienceScoutOutcomes } from "../lib/globe/trip-experience/merge-trip-experience-scout-outcomes";
import type { OneShotTripExperiencePrepPlan } from "../lib/globe/trip-experience/plan-one-shot-trip-experience-prep";
import { planOneShotTripExperiencePrep } from "../lib/globe/trip-experience/plan-one-shot-trip-experience-prep";

const ssot = {
  contextEventId: "evt-exp-parallel",
  scoutContract: null,
  selectedAnchor: null,
  lensSession: null,
  lastBatch: null,
  reelKinds: [],
  reelItemCount: 0,
  composeTail: [],
  hasActiveSpec: false,
  explorationMode: "diffuse",
} as unknown as OperatorTurnSsot;

const readyPlan: OneShotTripExperiencePrepPlan = {
  message: "재미있는 여행하고 싶어",
  experienceState: {
    funAxis: "food_market",
    destinationScope: "domestic_near",
    destinationLabel: "부산",
    checkInIso: "2026-07-11",
    checkOutIso: "2026-07-13",
    guestCount: 2,
    budgetBand: "balanced",
  },
  experienceGaps: [],
  readyForScout: true,
  scoutLegs: ["eatery", "lodging", "activity"],
  steps: [
    "parse_affect",
    "merge_experience_slots",
    "scout_lodging",
    "scout_eatery",
    "scout_activity",
    "select_main_legs",
  ],
};

const scouts = buildTripExperienceParallelScouts(readyPlan);
assert.equal(scouts.length, 3);
assert.equal(scouts[0]?.leg, "eatery");
assert.deepEqual([...scouts[0]!.spec.resourceTypes], ["restaurant"]);
assert.equal(scouts[1]?.leg, "lodging");
assert.deepEqual([...scouts[1]!.spec.resourceTypes], ["hotel"]);
assert.equal(scouts[2]?.leg, "activity");
assert.deepEqual([...scouts[2]!.spec.resourceTypes], ["activity"]);
assert.equal(scouts[0]?.spec.eateryFocus?.includes("부산"), true);

function mockOutcome(
  batchId: string,
  kind: "lodging" | "eatery" | "activity",
  count: number,
): ContextConditionAnchorPinOutcome {
  const recommendations = Array.from({ length: count }, (_, index) => ({
    kind,
    activitySubtype: kind === "activity" ? "general" : null,
    title: `${kind}-${index}`,
    reasonKo: "test",
    placeId: `place-${batchId}-${index}`,
    lat: 35.1,
    lng: 129.0,
    score: 0.9,
  }));
  return {
    batchId,
    lodgingCount: kind === "lodging" ? count : 0,
    eateryCount: kind === "eatery" ? count : 0,
    summaryKo: `${kind} ${count}`,
    radiusM: 3200,
    spec: scouts.find((row) => row.leg === kind)!.spec,
    recommendations,
    pinPoints: [],
  };
}

const merged = mergeTripExperienceScoutOutcomes({
  lodging: mockOutcome("lodging-batch", "lodging", 2),
  eatery: mockOutcome("eatery-batch", "eatery", 3),
  activity: mockOutcome("activity-batch", "activity", 4),
});
assert.ok(merged);
assert.equal(merged!.lodgingCount, 2);
assert.equal(merged!.eateryCount, 3);
assert.equal(merged!.recommendations.length, 9);
assert.ok(merged!.summaryKo.includes("숙소 2"));
assert.ok(merged!.summaryKo.includes("맛집 3"));
assert.ok(merged!.summaryKo.includes("놀거리 4"));
assert.ok(merged!.batchId.startsWith("trip-xp-"));

const readyEvent = {
  id: "evt-exp-parallel",
  title: "여행",
  datetime: "2026-07-11",
  lifecycle: "active",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  metadata: {
    contextTripFunAxis: "food_market",
    contextTripDestinationScope: "domestic_near",
    contextLodgingGuestCount: 2,
    planWindowEndIso: "2026-07-13",
    feedPlanEnabled: true,
  },
} as unknown as EventCandidate;

const message = "재미있는 여행하고 싶어";
const planFromEvent = planOneShotTripExperiencePrep({ message, event: readyEvent });
assert.ok(planFromEvent?.readyForScout);

const operatorPlan = gateOperatorTurnSync({ text: message, ssot, event: readyEvent });
assert.equal(operatorPlan.tool, "scout");
if (operatorPlan.tool === "scout") {
  assert.equal(operatorPlan.reason, "trip_experience_parallel");
}

console.log("test-trip-experience-parallel-scout: ok");
