#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  clearEateryRankModeOverride,
  readEateryRankModeOverride,
  resolveEateryRankMode,
  writeEateryRankModeOverride,
} from "../lib/globe/eatery/eatery-rank-mode-session-store";

const EVENT_ID = "evt-eatery-rank-mode-test";

clearEateryRankModeOverride(EVENT_ID);
assert.equal(resolveEateryRankMode(EVENT_ID), "auto");
assert.equal(readEateryRankModeOverride(EVENT_ID), null);

writeEateryRankModeOverride(EVENT_ID, "local");
assert.equal(resolveEateryRankMode(EVENT_ID), "local");
assert.equal(readEateryRankModeOverride(EVENT_ID), "local");

writeEateryRankModeOverride(EVENT_ID, "value");
assert.equal(resolveEateryRankMode(EVENT_ID), "value");

clearEateryRankModeOverride(EVENT_ID);
assert.equal(resolveEateryRankMode(EVENT_ID), "auto");

console.log("test-eatery-rank-mode-store: ok");
