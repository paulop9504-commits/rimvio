#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  DEFAULT_LODGING_RANK_PROFILE,
  DEFAULT_LODGING_RANK_WEIGHTS,
  applyLodgingRankContextHints,
  normalizeLodgingRankWeights,
  resolveLodgingRankPreset,
  resolveLodgingRankProfile,
  weightLodgingRankDimensionScore,
} from "../lib/globe/lodging/lodging-rank-profile";
import { scoreLodgingValueForMoneyDimension } from "../lib/globe/lodging/score-lodging-row-dimensions";

function sumWeights(weights: Record<string, number>): number {
  return Object.values(weights).reduce((total, value) => total + value, 0);
}

assert.equal(DEFAULT_LODGING_RANK_PROFILE.mode, "auto");
assert.ok(Math.abs(sumWeights(DEFAULT_LODGING_RANK_WEIGHTS) - 1) < 0.001);
assert.equal(DEFAULT_LODGING_RANK_WEIGHTS.price, 0.28);
assert.equal(DEFAULT_LODGING_RANK_WEIGHTS.quality, 0.36);

const normalized = normalizeLodgingRankWeights({
  price: 0.9,
  quality: 0.9,
  distance: 0.9,
  popularity: 0.9,
});
assert.ok(normalized.price <= 0.6);
assert.ok(Math.abs(sumWeights(normalized) - 1) < 0.001);

const valuePreset = resolveLodgingRankPreset("value");
assert.equal(valuePreset.mode, "value");
assert.ok(valuePreset.weights.quality > valuePreset.weights.price);
assert.ok(valuePreset.weights.distance >= 0.2);

const familyProfile = resolveLodgingRankProfile({
  mode: "auto",
  hints: { lodgingPriority: "family", companionMode: "parents" },
});
assert.equal(familyProfile.source, "context");
assert.ok(familyProfile.weights.quality > DEFAULT_LODGING_RANK_WEIGHTS.quality);

const manualPremium = resolveLodgingRankProfile({ mode: "premium" });
assert.equal(manualPremium.source, "preset");
assert.equal(manualPremium.mode, "premium");

const contextualAuto = applyLodgingRankContextHints(DEFAULT_LODGING_RANK_PROFILE, {
  lodgingPriority: "station",
});
assert.ok(contextualAuto.weights.distance > DEFAULT_LODGING_RANK_WEIGHTS.distance);

assert.equal(
  weightLodgingRankDimensionScore("price", 80, DEFAULT_LODGING_RANK_PROFILE),
  80 * 0.28,
);

// Mid-price near hub with solid goods beats dirt-cheap far dump.
const sweet = scoreLodgingValueForMoneyDimension({
  priceKrw: 95_000,
  qualityScore: 72,
  distanceScore: 88,
  popularityScore: 60,
  verificationScore100: 70,
  cohortMedianPriceKrw: 110_000,
});
const dump = scoreLodgingValueForMoneyDimension({
  priceKrw: 38_000,
  qualityScore: 28,
  distanceScore: 22,
  popularityScore: 30,
  verificationScore100: 35,
  cohortMedianPriceKrw: 110_000,
});
assert.ok(sweet > dump, `sweet(${sweet}) should beat dump(${dump})`);

console.log("test-lodging-rank-profile: ok");
