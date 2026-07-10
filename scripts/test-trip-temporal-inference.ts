import assert from "node:assert/strict";
import {
  assessTripIntakeGaps,
  inferTripTemporalFromContext,
  isOnTripNowMessage,
  readTripIntakeState,
} from "../lib/globe/trip-intake";
import type { EventCandidate } from "../lib/events/event-candidate";

assert.equal(isOnTripNowMessage("지금 출장중인데 부산 서면쪽 숙소 준비해"), true);
assert.equal(isOnTripNowMessage("오사카 7일 여행"), false);

const now = new Date("2026-07-10T15:00:00+09:00");
const busanEvent = {
  id: "evt-busan-trip",
  title: "부산 출장",
  place: "부산",
  datetime: "2026-07-10T00:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  metadata: {},
} as unknown as EventCandidate;

const inferred = inferTripTemporalFromContext({
  event: busanEvent,
  message: "지금 출장중인데 부산 서면쪽 숙소 예약 준비해",
  userLat: 35.158,
  userLng: 129.059,
  now,
});
assert.equal(inferred.onTripNow, true);
assert.equal(inferred.source, "message_on_trip");
assert.equal(inferred.checkInIso, "2026-07-10");
assert.equal(inferred.checkOutIso, "2026-07-11");
assert.equal(inferred.originLabel, "부산");
assert.equal(inferred.guestCount, 1);
assert.equal(inferred.budgetBand, "balanced");

const merged = readTripIntakeState({
  event: busanEvent,
  message: "지금 출장중인데 부산 서면쪽 숙소 예약 준비해",
  userLat: 35.158,
  userLng: 129.059,
  now,
});
assert.equal(merged.destinationLabel, "부산");
assert.equal(merged.checkInIso, "2026-07-10");
assert.equal(merged.checkOutIso, "2026-07-11");
assert.equal(merged.originLabel, "부산");
assert.ok(assessTripIntakeGaps(merged).length <= 1);

const planEvent = {
  ...busanEvent,
  id: "evt-plan-active",
  metadata: {
    planWindowEndIso: "2026-07-12T00:00:00.000Z",
    feedPlanEnabled: true,
  },
} as unknown as EventCandidate;

const planInferred = inferTripTemporalFromContext({
  event: planEvent,
  now,
});
assert.equal(planInferred.onTripNow, true);
assert.ok(
  planInferred.source === "calendar_plan" || planInferred.source === "stay_phase_mid",
);

console.log("test-trip-temporal-inference: ok");
