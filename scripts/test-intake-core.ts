import assert from "node:assert/strict";
import {
  assessGapsFromSlots,
  buildIntakeSnapshot,
  isIntakeComplete,
} from "../lib/intake";
import {
  TRIP_INTAKE_SLOT_DEFS,
  validateTripDates,
  validateTripGuestCount,
} from "../lib/globe/trip-intake";

const partial = {
  destinationLabel: "오사카",
  originLabel: null,
  checkInIso: "2026-07-10",
  checkOutIso: "2026-07-09",
  guestCount: 0,
  budgetBand: null,
};

const gaps = assessGapsFromSlots(partial, TRIP_INTAKE_SLOT_DEFS);
assert.ok(gaps.includes("origin"));
assert.ok(gaps.includes("dates"));
assert.ok(gaps.includes("guests"));
assert.ok(gaps.includes("budget"));

assert.equal(
  validateTripDates({
    ...partial,
    checkOutIso: "2026-07-17",
  }),
  true,
);
assert.equal(validateTripGuestCount({ ...partial, guestCount: 2 }), true);
assert.equal(validateTripGuestCount({ ...partial, guestCount: 0 }), false);

const complete = {
  destinationLabel: "오사카",
  originLabel: "인천",
  checkInIso: "2026-07-10",
  checkOutIso: "2026-07-17",
  guestCount: 2,
  budgetBand: "balanced" as const,
};
assert.equal(isIntakeComplete(complete, TRIP_INTAKE_SLOT_DEFS), true);

const snapshot = buildIntakeSnapshot({
  domainId: "trip",
  state: complete,
  slotDefs: TRIP_INTAKE_SLOT_DEFS,
});
assert.equal(snapshot.complete, true);
assert.equal(snapshot.gaps.length, 0);

console.log("test-intake-core: ok");
