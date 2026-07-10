import assert from "node:assert/strict";
import { gateOperatorTurnSync } from "../lib/globe/operator-turn/gate-operator-turn";
import { buildTripIntakeAskChips } from "../lib/globe/trip-intake/build-trip-intake-ask-chips";
import type { EventCandidate } from "../lib/events/event-candidate";
import type { OperatorTurnSsot } from "../lib/globe/operator-turn/types";

const ssot = {
  contextEventId: "evt-op",
  scoutContract: null,
  selectedAnchor: null,
  lensSession: null,
  lastBatch: null,
  reelKinds: [],
  reelItemCount: 0,
  composeTail: [],
  hasActiveSpec: false,
  explorationMode: "convergent",
} as unknown as OperatorTurnSsot;

const emptyEvent = {
  id: "evt-op",
  title: "여행",
  datetime: "2026-07-10T00:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  metadata: {},
} as unknown as EventCandidate;

const plan = gateOperatorTurnSync({
  text: "부산 서면쪽 숙소 예약 준비해",
  ssot,
  event: emptyEvent,
});
assert.equal(plan.tool, "ask_chips");
if (plan.tool === "ask_chips") {
  assert.equal(plan.reason, "trip_intake_gap");
  assert.ok(plan.chips.length >= 2);
}

const dateChips = buildTripIntakeAskChips(["dates"]);
assert.ok(dateChips.some((chip) => chip.id === "dates_tonight"));

const ready = gateOperatorTurnSync({
  text: "지금 출장중인데 부산 서면쪽 숙소 예약 준비해",
  ssot,
  event: {
    ...emptyEvent,
    title: "부산 출장",
    place: "부산",
    metadata: {
      contextTripOriginLabel: "부산",
      contextTripBudgetBand: "balanced",
    },
  },
  userLat: 35.158,
  userLng: 129.059,
});
assert.equal(ready.tool, "scout");
assert.equal(ready.reason, "instant_lodging_search");

console.log("test-operator-ask-chips-slots: ok");
