import assert from "node:assert/strict";
import {
  areLodgingStayDatesValid,
  clampLodgingCheckInYmd,
  lodgingCheckOutMinYmd,
  normalizeLodgingStayYmdPair,
} from "../lib/globe/context-hub/lodging-booking-date-bounds";

const today = "2026-07-18";

assert.equal(clampLodgingCheckInYmd("2026-07-17", today), "2026-07-18");
assert.equal(clampLodgingCheckInYmd("2026-07-18", today), "2026-07-18");
assert.equal(clampLodgingCheckInYmd("2026-07-20", today), "2026-07-20");

assert.equal(lodgingCheckOutMinYmd("2026-07-17", today), "2026-07-19");
assert.equal(lodgingCheckOutMinYmd("2026-07-18", today), "2026-07-19");
assert.equal(lodgingCheckOutMinYmd("2026-07-20", today), "2026-07-21");

assert.equal(
  areLodgingStayDatesValid({
    checkInYmd: "2026-07-17",
    checkOutYmd: "2026-07-18",
    today,
  }),
  false,
);
assert.equal(
  areLodgingStayDatesValid({
    checkInYmd: "2026-07-18",
    checkOutYmd: "2026-07-19",
    today,
  }),
  true,
);

const normalized = normalizeLodgingStayYmdPair({
  checkInYmd: "2026-07-17",
  checkOutYmd: "2026-07-18",
  today,
});
assert.deepEqual(normalized, {
  checkInYmd: "2026-07-18",
  checkOutYmd: "2026-07-19",
});

console.log("test-lodging-booking-date-bounds: ok");
