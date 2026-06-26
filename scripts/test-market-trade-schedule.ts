#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildMarketTradeMeetAtIsoFromParts,
  generateMarketTradeDateCandidates,
  generateMarketTradeTimeSlotsForDate,
  formatMarketTradeDateLabelKo,
  isMeetTimeAllowedForTrade,
  isScheduleDateCandidateAllowed,
  marketTradeScheduleDateCandidatesNeedBackfill,
  resolveMarketTradeScheduleDateCandidates,
  suggestMarketTradeProposeTimeValue,
  toMarketTradeDateKey,
} from "../lib/globe/market/market-trade-schedule";

const now = new Date("2026-06-26T10:00:00+09:00");

const weekdayDates = generateMarketTradeDateCandidates("weekday_afternoon", now);
assert.ok(weekdayDates.length >= 2);
weekdayDates.forEach((key) => {
  const date = new Date(`${key}T12:00:00`);
  assert.ok(date.getDay() >= 1 && date.getDay() <= 5);
});

const weekendDates = generateMarketTradeDateCandidates("weekend_day", now);
assert.ok(weekendDates.length >= 1);
weekendDates.forEach((key) => {
  const date = new Date(`${key}T12:00:00`);
  assert.ok(date.getDay() === 0 || date.getDay() === 6);
});

const todayKey = toMarketTradeDateKey(now);
const slots = generateMarketTradeTimeSlotsForDate("weekday_afternoon", todayKey, now);
assert.ok(slots.length >= 1);

assert.equal(formatMarketTradeDateLabelKo(todayKey, now), "오늘");
assert.ok(isScheduleDateCandidateAllowed(weekdayDates[0]!, weekdayDates));

const customTime = suggestMarketTradeProposeTimeValue(todayKey, now);
assert.match(customTime, /^\d{2}:\d{2}$/u);
const customMeetAt = buildMarketTradeMeetAtIsoFromParts(todayKey, "15:30");
assert.ok(customMeetAt);
assert.ok(
  isMeetTimeAllowedForTrade({
    meetAtIso: customMeetAt!,
    dateKey: todayKey,
    now,
  }),
);

const emptyResolved = resolveMarketTradeScheduleDateCandidates([], "weekday_afternoon", now);
assert.ok(emptyResolved.length >= 2);
assert.equal(formatMarketTradeDateLabelKo(emptyResolved[0]!, now), "오늘");
assert.ok(marketTradeScheduleDateCandidatesNeedBackfill([], "weekday_afternoon", now));

const legacyIso = ["2026-06-28T04:00:00.000Z", "2026-06-29T04:00:00.000Z"];
assert.ok(marketTradeScheduleDateCandidatesNeedBackfill(legacyIso, "anytime", now));
const legacyResolved = resolveMarketTradeScheduleDateCandidates(legacyIso, "anytime", now);
assert.ok(legacyResolved.every((key) => /^\d{4}-\d{2}-\d{2}$/u.test(key)));
assert.equal(legacyResolved[0], "2026-06-28");

assert.equal(
  isMeetTimeAllowedForTrade({
    meetAtIso: buildMarketTradeMeetAtIsoFromParts(todayKey, "10:15")!,
    dateKey: todayKey,
    now,
  }),
  false,
);

console.log("test-market-trade-schedule: ok");
