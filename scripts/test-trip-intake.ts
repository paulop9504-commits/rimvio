import assert from "node:assert/strict";
import { classifyTravelRequestScope } from "../lib/container-ai/classify-travel-request-scope";
import {
  assessTripIntakeGaps,
  hasCompleteTripIntake,
  isBroadTripPackageMessage,
  readTripIntakeState,
  shouldOpenTripIntake,
  validateTripDates,
  validateTripGuestCount,
  validateTripIntakeSlot,
} from "../lib/globe/trip-intake";
import type { EventCandidate } from "../lib/events/event-candidate";

assert.equal(
  classifyTravelRequestScope("오사카 7일 여행, 초행이니까 잘 부탁해").scope,
  "broad",
);
assert.equal(isBroadTripPackageMessage("오사카 7일 여행, 초행이니까 잘 부탁해"), true);
assert.equal(isBroadTripPackageMessage("주변 호텔"), false);
assert.equal(isBroadTripPackageMessage("이 맥락 오사카로 옮겨"), false);
assert.equal(isBroadTripPackageMessage("이 맥락 제주도로 옮겨줘"), false);

const emptyEvent = {
  id: "evt-trip-intake",
  title: "여행",
  datetime: "2026-07-10T00:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  metadata: {},
} as unknown as EventCandidate;

assert.equal(
  shouldOpenTripIntake({
    message: "이 맥락 오사카로 옮겨",
    event: emptyEvent,
  }),
  false,
);

const partial = readTripIntakeState({
  event: emptyEvent,
  message: "오사카 7일 여행",
});
assert.equal(partial.destinationLabel, "오사카");
assert.ok(assessTripIntakeGaps(partial).length > 0);

assert.equal(
  shouldOpenTripIntake({
    message: "오사카 7일, 초행 잘 부탁",
    event: emptyEvent,
  }),
  true,
);

const completeState = {
  destinationLabel: "오사카",
  originLabel: "인천",
  checkInIso: "2026-07-10",
  checkOutIso: "2026-07-17",
  guestCount: 2,
  budgetBand: "balanced" as const,
};
assert.equal(hasCompleteTripIntake(completeState), true);
assert.equal(assessTripIntakeGaps(completeState).length, 0);

assert.equal(
  validateTripDates({
    ...completeState,
    checkOutIso: "2026-07-09",
  }),
  false,
);
assert.equal(validateTripGuestCount({ ...completeState, guestCount: 2 }), true);
assert.equal(validateTripIntakeSlot("destination", completeState), true);

console.log("test-trip-intake: ok");
