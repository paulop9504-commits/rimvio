#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { computeMarketTradeHostEta } from "../lib/globe/market/compute-market-trade-host-eta";
import {
  formatMarketTradeCountdownLabel,
  resolveMarketTradeActiveStep,
} from "../lib/globe/market/resolve-market-trade-progress";

const meetAt = new Date();
meetAt.setHours(meetAt.getHours() + 3, 0, 0, 0);

const step = resolveMarketTradeActiveStep({
  tradeStatus: "confirmed",
  meetAtIso: meetAt.toISOString(),
  now: new Date(),
});
assert.equal(step, "confirmed");

const nearDepart = new Date(meetAt.getTime() - 90 * 60 * 1000);
const departStep = resolveMarketTradeActiveStep({
  tradeStatus: "confirmed",
  meetAtIso: meetAt.toISOString(),
  now: nearDepart,
});
assert.equal(departStep, "before_departure");

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

console.log("test-market-trade-progress: ok");
