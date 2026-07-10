import assert from "node:assert/strict";
import { gateOperatorTurnSync } from "../lib/globe/operator-turn/gate-operator-turn";
import { isTripExperienceUtterance } from "../lib/globe/trip-experience/detect-trip-experience-utterance";
import { planOneShotTripExperiencePrep } from "../lib/globe/trip-experience/plan-one-shot-trip-experience-prep";
import { buildTripExperienceAskChips } from "../lib/globe/trip-experience/build-trip-experience-ask-chips";
import type { EventCandidate } from "../lib/events/event-candidate";
import type { OperatorTurnSsot } from "../lib/globe/operator-turn/types";

const ssot = {
  contextEventId: "evt-exp",
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

const emptyEvent = {
  id: "evt-exp",
  title: "여행",
  datetime: "2026-07-10T00:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  metadata: {},
} as unknown as EventCandidate;

const message = "재미있는 여행하고 싶어";
assert.equal(isTripExperienceUtterance(message), true);
assert.equal(isTripExperienceUtterance("부산 서면쪽 숙소 예약 준비해"), false);

const plan = planOneShotTripExperiencePrep({ message, event: emptyEvent });
assert.ok(plan);
assert.equal(plan!.readyForScout, false);
assert.ok(plan!.experienceGaps.includes("fun_axis"));
assert.ok(plan!.experienceGaps.includes("destination_scope"));

const chips = buildTripExperienceAskChips(plan!.experienceGaps);
assert.ok(chips.some((chip) => chip.id === "fun_food"));

const operatorPlan = gateOperatorTurnSync({ text: message, ssot, event: emptyEvent });
assert.equal(operatorPlan.tool, "ask_chips");
if (operatorPlan.tool === "ask_chips") {
  assert.equal(operatorPlan.reason, "trip_experience_gap");
}

console.log("test-trip-experience-domain: ok");
