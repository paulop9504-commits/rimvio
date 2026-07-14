#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildLodgingOpportunityInsight,
  isLodgingValueLeaning,
  medianLodgingPriceKrw,
} from "../lib/globe/lodging/build-lodging-opportunity-insight";

assert.equal(medianLodgingPriceKrw([90_000, 120_000, 80_000]), 90_000);
assert.equal(medianLodgingPriceKrw([null, 0, undefined]), null);
assert.equal(isLodgingValueLeaning({ mode: "value" }), true);
assert.equal(isLodgingValueLeaning({ mode: "premium" }), false);
assert.equal(isLodgingValueLeaning({ priceWeight: 0.42 }), true);

const hub = { lat: 34.6937, lng: 135.5023 };

const near = buildLodgingOpportunityInsight({
  lodgingLat: hub.lat + 0.004,
  lodgingLng: hub.lng,
  hubLat: hub.lat,
  hubLng: hub.lng,
  priceKrw: 85_000,
  cohortMedianPriceKrw: 120_000,
  lodgingPriority: "price",
  budgetBand: "value",
  rankMode: "value",
});

assert.ok(near.saveLineKo?.includes("도보") || near.saveLineKo?.includes("이동"));
assert.ok(near.experienceLineKo?.trim());
assert.ok(near.primaryLineKo?.trim());
assert.ok(near.lines.length >= 1);
assert.ok(!/정확히|₩\d{4,}/u.test(near.lines.join(" ")));

const far = buildLodgingOpportunityInsight({
  lodgingLat: hub.lat + 0.06,
  lodgingLng: hub.lng,
  hubLat: hub.lat,
  hubLng: hub.lng,
  priceKrw: 55_000,
  cohortMedianPriceKrw: 120_000,
  lodgingPriority: "price",
  rankMode: "value",
});

assert.ok(far.opportunityCostLineKo?.includes("왕복"));
assert.ok(
  far.primaryLineKo === far.saveLineKo ||
    far.primaryLineKo === far.opportunityCostLineKo ||
    far.primaryLineKo === far.experienceLineKo,
);

const aesthetic = buildLodgingOpportunityInsight({
  lodgingLat: hub.lat + 0.003,
  lodgingLng: hub.lng,
  hubLat: hub.lat,
  hubLng: hub.lng,
  lodgingPriority: "aesthetic",
  rankMode: "auto",
});
assert.ok(aesthetic.experienceLineKo?.includes("분위기") || aesthetic.experienceLineKo?.includes("저녁"));

console.log("test-lodging-opportunity-insight: ok");
