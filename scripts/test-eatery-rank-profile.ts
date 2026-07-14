#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  DEFAULT_EATERY_RANK_PROFILE,
  DEFAULT_EATERY_RANK_WEIGHTS,
  applyEateryRankContextHints,
  normalizeEateryRankWeights,
  resolveEateryRankPreset,
  resolveEateryRankProfile,
  weightEateryRankDimensionScore,
} from "../lib/globe/eatery/eatery-rank-profile";

function sumWeights(weights: Record<string, number>): number {
  return Object.values(weights).reduce((total, value) => total + value, 0);
}

assert.equal(DEFAULT_EATERY_RANK_PROFILE.mode, "auto");
assert.ok(Math.abs(sumWeights(DEFAULT_EATERY_RANK_WEIGHTS) - 1) < 0.001);
assert.equal(DEFAULT_EATERY_RANK_WEIGHTS.cuisineFit, 0.32);

const normalized = normalizeEateryRankWeights({
  cuisineFit: 0.9,
  price: 0.9,
  distance: 0.9,
  vibe: 0.9,
});
assert.ok(normalized.cuisineFit <= 0.55);
assert.ok(Math.abs(sumWeights(normalized) - 1) < 0.001);

const localPreset = resolveEateryRankPreset("local");
assert.equal(localPreset.mode, "local");
assert.ok(localPreset.weights.vibe > DEFAULT_EATERY_RANK_WEIGHTS.vibe);

const localProfile = resolveEateryRankProfile({
  mode: "auto",
  hints: { foodBias: "local", companionMode: "couple" },
});
assert.equal(localProfile.source, "context");
assert.ok(localProfile.weights.vibe > DEFAULT_EATERY_RANK_WEIGHTS.vibe);

const manualValue = resolveEateryRankProfile({ mode: "value" });
assert.equal(manualValue.source, "preset");
assert.equal(manualValue.mode, "value");

const contextualAuto = applyEateryRankContextHints(DEFAULT_EATERY_RANK_PROFILE, {
  foodBias: "late_night",
});
assert.ok(contextualAuto.weights.distance >= DEFAULT_EATERY_RANK_WEIGHTS.distance);

assert.equal(
  weightEateryRankDimensionScore("cuisineFit", 80, DEFAULT_EATERY_RANK_PROFILE),
  80 * 0.32,
);

console.log("test-eatery-rank-profile: ok");
