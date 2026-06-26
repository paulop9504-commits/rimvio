import assert from "node:assert/strict";
import { formatRegionalDistance } from "../lib/format/format-regional-distance";
import { formatRegionalMarketPriceLine } from "../lib/format/format-regional-money";
import { formatRegionalMeetAtLabel } from "../lib/format/format-regional-datetime";
import { formatMarketPriceLine } from "../lib/globe/market/format-market-price-line";
import { resolveRegionalProfile } from "../lib/preferences/regional-profile";

const kr = resolveRegionalProfile("KR");
const us = resolveRegionalProfile("US");
const gb = resolveRegionalProfile("GB");

assert.equal(formatRegionalDistance(0.5, kr), "500 m");
assert.equal(formatRegionalDistance(2.4, kr), "2.4 km");
assert.equal(formatRegionalDistance(2.4, us), "1.5 mi");
assert.equal(formatRegionalDistance(0.05, us), "164 ft");

assert.equal(formatMarketPriceLine(500_000, 500_000, kr), "50만원");
assert.equal(formatMarketPriceLine(300_000, 800_000, kr), "30만원~80만원");
assert.match(formatMarketPriceLine(500_000, 500_000, us), /₩|KRW|500/);

assert.equal(
  formatRegionalMarketPriceLine(null, null, kr, "가격 협의"),
  "가격 협의",
);

const meetAt = "2026-06-26T14:30:00.000Z";
assert.match(formatRegionalMeetAtLabel(meetAt, kr), /6/);
assert.match(formatRegionalMeetAtLabel(meetAt, us), /Jun|6/);

console.log("test-regional-format: ok");
