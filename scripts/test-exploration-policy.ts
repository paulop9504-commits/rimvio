#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  applyConvergedIntentCapBoost,
  applyExplorationMode,
  explorationScoreBias,
  guardThresholdForDomain,
  isScoutIntentConverged,
  resolveExplorationMode,
} from "../lib/globe/discovery-policy";
import { DISCOVERY_GUARD_THRESHOLD } from "../lib/globe/context-condition-ai/discovery-guard/verify-discovery-results";

assert.equal(resolveExplorationMode({ message: "주변 맛집" }), "convergent");
assert.equal(
  resolveExplorationMode({ message: "주변 맛집", spec: { vibe: "popular" } }),
  "convergent",
);
assert.equal(
  resolveExplorationMode({ message: "골목 맛집", spec: { vibe: "local" } }),
  "diffuse",
);
assert.equal(resolveExplorationMode({ message: "다른 곳 보여줘" }), "diffuse");
assert.equal(resolveExplorationMode({ message: "숨은 카페" }), "diffuse");
assert.equal(
  resolveExplorationMode({ message: "주변 캡슐호텔 싹 찾아줘" }),
  "diffuse",
);
assert.equal(
  resolveExplorationMode({
    message: "도쿄 디즈니",
    explicitLandmark: true,
  }),
  "convergent",
);

const convergent = applyExplorationMode("convergent");
const diffuse = applyExplorationMode("diffuse");

assert.equal(convergent.pinCap, 3);
assert.equal(diffuse.pinCap, 5);
assert.equal(convergent.eateryMaxResults, 14);
assert.equal(diffuse.eateryMaxResults, 18);
assert.equal(convergent.eateryPresentCap, 6);
assert.equal(diffuse.eateryPresentCap, 8);
assert.equal(
  guardThresholdForDomain(convergent, "eatery"),
  DISCOVERY_GUARD_THRESHOLD.eatery,
);
assert.ok(
  guardThresholdForDomain(diffuse, "eatery") <
    guardThresholdForDomain(convergent, "eatery"),
);
assert.ok(
  guardThresholdForDomain(diffuse, "activity") <
    guardThresholdForDomain(convergent, "activity"),
);
assert.equal(convergent.activityLandmarkPinCap, 1);
assert.equal(diffuse.activityLandmarkPinCap, 3);
assert.ok(diffuse.lodgingMaxResults >= convergent.lodgingMaxResults);
assert.ok(diffuse.lodgingRadiusBoostM > convergent.lodgingRadiusBoostM);
assert.ok(convergent.ratingWeight > diffuse.ratingWeight);
assert.ok(diffuse.noveltyWeight > convergent.noveltyWeight);

assert.equal(
  resolveExplorationMode({
    message: "주변 맛집",
    override: "diffuse",
  }),
  "diffuse",
);

assert.ok(
  explorationScoreBias({
    knobs: convergent,
    rating: 4.5,
    labels: ["유명 관광 맛집"],
  }) > 0,
);
assert.ok(
  explorationScoreBias({
    knobs: diffuse,
    rating: 4.5,
    labels: ["골목 로컬 식당"],
  }) >
    explorationScoreBias({
      knobs: convergent,
      rating: 4.5,
      labels: ["골목 로컬 식당"],
    }),
);

assert.ok(isScoutIntentConverged({ message: "초밥" }));
assert.ok(!isScoutIntentConverged({ message: "주변 맛집" }));

const boosted = applyConvergedIntentCapBoost(convergent, { message: "도쿄역 초밥" });
assert.ok(boosted.eateryPresentCap >= 14);
assert.ok(boosted.eateryMaxResults >= 28);
assert.ok(boosted.pinCap >= 6);
assert.equal(
  applyConvergedIntentCapBoost(convergent, { message: "주변 맛집" }).eateryPresentCap,
  convergent.eateryPresentCap,
);

console.log("test-exploration-policy: ok");
