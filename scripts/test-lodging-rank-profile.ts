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

function sumWeights(weights: Record<string, number>): number {
  return Object.values(weights).reduce((total, value) => total + value, 0);
}

assert.equal(DEFAULT_LODGING_RANK_PROFILE.mode, "auto");
assert.ok(Math.abs(sumWeights(DEFAULT_LODGING_RANK_WEIGHTS) - 1) < 0.001);
assert.equal(DEFAULT_LODGING_RANK_WEIGHTS.price, 0.4);
assert.equal(DEFAULT_LODGING_RANK_WEIGHTS.quality, 0.35);

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
assert.ok(valuePreset.weights.price > DEFAULT_LODGING_RANK_WEIGHTS.price);

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
  80 * 0.4,
);

console.log("test-lodging-rank-profile: ok");
