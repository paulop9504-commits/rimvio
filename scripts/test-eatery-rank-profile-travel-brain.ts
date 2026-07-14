#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { resolveEateryRankProfileFromTravelBrain } from "../lib/globe/eatery/resolve-eatery-rank-profile-from-travel-brain";
import { DEFAULT_EATERY_RANK_WEIGHTS } from "../lib/globe/eatery/eatery-rank-profile";
import { buildTravelBrainState } from "../lib/situation-projection/travel-brain-personalization";

const localEvent = {
  id: "evt-local-food-osaka",
  title: "오사카 로컬 맛집",
  place: "오사카",
  description: "현지 골목 맛집 위주",
  datetime: "2026-08-01T00:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  metadata: {},
} as unknown as EventCandidate;

const localBrain = buildTravelBrainState(localEvent);
const localProfile = resolveEateryRankProfileFromTravelBrain({
  travelBrain: localBrain,
});

assert.equal(localBrain.slots.food_bias.value, "local");
assert.ok(
  localBrain.slots.food_bias.confidence >= 0.55 ||
    localBrain.slots.food_bias.source === "learned",
);
assert.equal(localProfile.source, "context");
assert.ok(localProfile.weights.vibe > DEFAULT_EATERY_RANK_WEIGHTS.vibe);
assert.ok(localProfile.reasonKo?.trim());

const valueEvent = {
  id: "evt-value-food",
  title: "도쿄 가성비 식사",
  place: "도쿄",
  description: "저렴한 맛집",
  datetime: "2026-07-10T00:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  metadata: {},
} as unknown as EventCandidate;

const valueBrain = buildTravelBrainState(valueEvent);
const valueProfile = resolveEateryRankProfileFromTravelBrain({
  travelBrain: valueBrain,
});

assert.ok(
  valueProfile.weights.price >= DEFAULT_EATERY_RANK_WEIGHTS.price ||
    valueBrain.slots.food_bias.value === "value",
);

console.log("test-eatery-rank-profile-travel-brain: ok");
