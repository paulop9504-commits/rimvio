#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  marketTradeMeetTimesConflict,
  MARKET_TRADE_MEET_CONFLICT_WINDOW_MS,
} from "../lib/globe/market/market-trade-meet-conflict";
import { readMarketTradeCancelReasonId } from "../lib/globe/market/market-trade-cancel-reasons";

const base = "2026-06-30T14:00:00+09:00";
const near = new Date(Date.parse(base) + 30 * 60 * 1000).toISOString();
const far = new Date(Date.parse(base) + MARKET_TRADE_MEET_CONFLICT_WINDOW_MS).toISOString();

assert.ok(marketTradeMeetTimesConflict(base, near));
assert.equal(marketTradeMeetTimesConflict(base, far), false);
assert.equal(readMarketTradeCancelReasonId("schedule_conflict"), "schedule_conflict");
assert.equal(readMarketTradeCancelReasonId("unknown"), null);

console.log("test-market-trade-meet-conflict: ok");
