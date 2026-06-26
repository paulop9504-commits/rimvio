#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { computeMarketTradeHostEta } from "../lib/globe/market/compute-market-trade-host-eta";
import {
  formatMarketTradeCountdownLabel,
  resolveMarketTradeActiveStep,
} from "../lib/globe/market/resolve-market-trade-progress";
import { isMarketTradeDepartWindowOpen } from "../lib/globe/market/market-trade-depart-window";
import {
  generateMarketTradeScheduleCandidates,
  MARKET_SCHEDULING_SLA_HOURS,
} from "../lib/globe/market/market-availability-preset";
import { formatMarketTradeSchedulingCountdown } from "../lib/globe/market/resolve-market-trade-scheduling";

const meetAt = new Date();
meetAt.setHours(meetAt.getHours() + 4, 0, 0, 0);

const step = resolveMarketTradeActiveStep({
  tradeStatus: "confirmed",
  meetAtIso: meetAt.toISOString(),
  now: new Date(),
});
assert.equal(step, "confirmed");

const nearDepart = new Date(meetAt.getTime() - 2.5 * 60 * 60 * 1000);
const departStep = resolveMarketTradeActiveStep({
  tradeStatus: "confirmed",
  meetAtIso: meetAt.toISOString(),
  now: nearDepart,
});
assert.equal(departStep, "before_departure");

assert.equal(isMarketTradeDepartWindowOpen(meetAt.toISOString(), new Date()), false);
assert.equal(
  isMarketTradeDepartWindowOpen(meetAt.toISOString(), nearDepart),
  true,
);

const enRouteStep = resolveMarketTradeActiveStep({
  tradeStatus: "en_route",
  meetAtIso: meetAt.toISOString(),
  meetLat: 37.5665,
  meetLng: 126.978,
  guestLat: 37.56,
  guestLng: 126.97,
  guestLocationAtIso: new Date().toISOString(),
});
assert.equal(enRouteStep, "before_departure");

const eta = computeMarketTradeHostEta({
  guestLat: 37.56,
  guestLng: 126.97,
  guestLocationAtIso: new Date().toISOString(),
  anchorLat: 37.5665,
  anchorLng: 126.978,
});
assert.ok(eta && eta.etaMinutes >= 1);

const countdown = formatMarketTradeCountdownLabel(meetAt.toISOString(), new Date());
assert.ok(countdown);

const weekdayAfternoon = generateMarketTradeScheduleCandidates(
  "weekday_afternoon",
  new Date("2026-06-26T10:00:00+09:00"),
);
assert.equal(weekdayAfternoon.length, 3);
weekdayAfternoon.forEach((slot) => {
  const d = new Date(slot);
  assert.ok(d.getDay() >= 1 && d.getDay() <= 5, "weekday_afternoon skips weekend");
});

const weekendEvening = generateMarketTradeScheduleCandidates(
  "weekend_evening",
  new Date("2026-06-26T10:00:00+09:00"),
);
assert.equal(weekendEvening.length, 3);
weekendEvening.forEach((slot) => {
  const d = new Date(slot);
  assert.ok(d.getDay() === 0 || d.getDay() === 6, "weekend_evening is sat/sun");
  assert.ok(d.getHours() >= 18, "weekend_evening is evening");
});

const weekend = generateMarketTradeScheduleCandidates("weekend_day", new Date("2026-06-26T10:00:00+09:00"));
assert.equal(weekend.length, 3);
weekend.forEach((slot) => {
  const d = new Date(slot);
  assert.ok(d.getDay() === 0 || d.getDay() === 6, "weekend_day is sat/sun");
});

const anytime = generateMarketTradeScheduleCandidates("anytime", new Date("2026-06-26T10:00:00+09:00"));
assert.equal(anytime.length, 3);

assert.equal(MARKET_SCHEDULING_SLA_HOURS, 24);
const slaLabel = formatMarketTradeSchedulingCountdown(
  new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  new Date(),
);
assert.ok(slaLabel);

console.log("test-market-trade-progress: ok");
