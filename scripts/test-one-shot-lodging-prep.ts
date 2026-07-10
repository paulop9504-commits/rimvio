import assert from "node:assert/strict";
import { planOneShotLodgingPrep } from "../lib/globe/lodging-prep/plan-one-shot-lodging-prep";
import type { EventCandidate } from "../lib/events/event-candidate";

const now = new Date("2026-07-10T15:00:00+09:00");
const event = {
  id: "evt-one-shot",
  title: "부산 출장",
  place: "부산",
  datetime: "2026-07-10T00:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  metadata: {
    contextTripOriginLabel: "부산",
    contextTripBudgetBand: "balanced",
  },
} as unknown as EventCandidate;

const plan = planOneShotLodgingPrep({
  message: "지금 출장중인데 부산 서면쪽 숙소 예약 준비해",
  event,
  userLat: 35.158,
  userLng: 129.059,
  now,
  expressReady: true,
});
assert.ok(plan);
assert.ok(plan!.spatialTarget);
assert.match(plan!.spatialTarget!.label, /서면/u);
assert.equal(plan!.intakeState.checkInIso, "2026-07-10");
assert.equal(plan!.readyForScout, true);
assert.equal(plan!.readyForExpress, true);
assert.deepEqual(plan!.steps, [
  "parse_spatial",
  "merge_intake",
  "scout_lodging",
  "select_main_offer",
  "open_express_checkout",
]);

console.log("test-one-shot-lodging-prep: ok");
