import assert from "node:assert/strict";
import {
  clearLodgingRankModeOverride,
  readLodgingRankModeOverride,
  resolveLodgingRankMode,
  writeLodgingRankModeOverride,
} from "@/lib/globe/lodging/lodging-rank-mode-session-store";

const EVENT_ID = "evt-lodging-rank-mode-test";

clearLodgingRankModeOverride(EVENT_ID);
assert.equal(readLodgingRankModeOverride(EVENT_ID), null);
assert.equal(resolveLodgingRankMode(EVENT_ID), "auto");

writeLodgingRankModeOverride(EVENT_ID, "value");
assert.equal(readLodgingRankModeOverride(EVENT_ID), "value");
assert.equal(resolveLodgingRankMode(EVENT_ID), "value");

writeLodgingRankModeOverride(EVENT_ID, "distance");
assert.equal(resolveLodgingRankMode(EVENT_ID), "distance");

clearLodgingRankModeOverride(EVENT_ID);
assert.equal(resolveLodgingRankMode(EVENT_ID), "auto");

console.log("test-lodging-rank-mode-store: ok");
