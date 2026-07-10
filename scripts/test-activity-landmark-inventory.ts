#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { classifyPlaceCategory } from "../lib/globe/context-condition-ai/discovery-guard/classify-place-category";
import { verifyDiscoveryResults } from "../lib/globe/context-condition-ai/discovery-guard/verify-discovery-results";
import { assessIntentConvergence } from "../lib/globe/context-condition-ai/intent-convergence/assess-intent-convergence";
import { isExplicitActivityLandmarkQuery } from "../lib/globe/context-condition-ai/resolve-activity-landmark-inventory";
import { resolveLocalDiscoveryAction } from "../lib/globe/context-condition-ai/resolve-local-discovery-action";

assert.equal(isExplicitActivityLandmarkQuery("도쿄 디즈니"), true);
assert.equal(isExplicitActivityLandmarkQuery("도쿄 디즈니랜드"), true);
assert.equal(isExplicitActivityLandmarkQuery("Tokyo Disney"), true);
assert.equal(isExplicitActivityLandmarkQuery("유니버설 스튜디오"), true);
assert.equal(isExplicitActivityLandmarkQuery("Eiffel Tower"), true);
assert.equal(isExplicitActivityLandmarkQuery("Louvre Museum"), true);
assert.equal(isExplicitActivityLandmarkQuery("놀거리"), false);
assert.equal(isExplicitActivityLandmarkQuery("라멘"), false);

const disneyRow = {
  row: {
    name: "東京ディズニーランド",
    categoryLabel: "theme_park",
    cuisineHint: null,
    address: "千葉県浦安市舞浜",
  },
};

assert.equal(classifyPlaceCategory(disneyRow.row), "theme_park");

assert.equal(
  classifyPlaceCategory({
    name: "오사카성 공원",
    categoryLabel: "tourist_attraction park point_of_interest",
    cuisineHint: null,
    address: "Osaka",
  }),
  "park",
);

const guarded = verifyDiscoveryResults({
  domain: "activity",
  items: [disneyRow],
  focusTokens: ["디즈니", "도쿄"],
});
assert.equal(guarded.kept.length, 1);
assert.equal(guarded.kept[0]?.row.name, "東京ディズニーランド");

const converged = resolveLocalDiscoveryAction({
  message: "놀거리",
  answers: { activityFocus: "도쿄 디즈니랜드" },
});
assert.equal(converged.status, "ready");
if (converged.status === "ready") {
  assert.equal(converged.spec.activityFocus, "도쿄 디즈니랜드");
  assert.ok(converged.spec.resourceTypes.includes("activity"));
  assert.equal(converged.spec.activitySubtype, "general");
}

const museum = resolveLocalDiscoveryAction({
  message: "도쿄 박물관 추천",
});
assert.equal(museum.status, "ready");
if (museum.status === "ready") {
  assert.equal(museum.spec.activitySubtype, "museum");
  assert.equal(museum.spec.activityFocus, "박물관·미술관");
}

const shopping = resolveLocalDiscoveryAction({
  message: "오사카 쇼핑할 곳",
});
assert.equal(shopping.status, "ready");
if (shopping.status === "ready") {
  assert.equal(shopping.spec.activitySubtype, "shopping");
}

assert.equal(
  classifyPlaceCategory({
    name: "Shibuya Sky",
    categoryLabel: "photo_spot",
    cuisineHint: null,
    address: "Tokyo",
  }),
  "photo_spot",
);
assert.equal(
  classifyPlaceCategory({
    name: "Tokyo Rooftop Bar",
    categoryLabel: "nightlife",
    cuisineHint: null,
    address: "Tokyo",
  }),
  "nightlife",
);

const photoGuard = verifyDiscoveryResults({
  domain: "activity",
  items: [
    {
      row: {
        name: "Shibuya Sky",
        categoryLabel: "photo_spot",
        cuisineHint: null,
        address: "Tokyo",
      },
    },
  ],
  focusTokens: ["시부야", "사진"],
});
assert.equal(photoGuard.kept.length, 1);

const nightlifeGuard = verifyDiscoveryResults({
  domain: "activity",
  items: [
    {
      row: {
        name: "Tokyo Rooftop Bar",
        categoryLabel: "nightlife",
        cuisineHint: null,
        address: "Tokyo",
      },
    },
  ],
  focusTokens: ["도쿄", "야경"],
});
assert.equal(nightlifeGuard.kept.length, 1);

const googleUnknownBroad = verifyDiscoveryResults({
  domain: "activity",
  items: [
    {
      row: {
        name: "Nakanoshima River Walk",
        categoryLabel: null,
        cuisineHint: null,
        address: "Osaka river promenade",
      },
    },
  ],
  focusTokens: ["river", "walk", "promenade"],
});
assert.equal(googleUnknownBroad.kept.length, 1);

const broadConvergence = assessIntentConvergence({
  message: "놀거리",
  answers: {},
  askedAxisIds: [],
});
assert.equal(broadConvergence.shouldAsk, false);
if (!broadConvergence.shouldAsk) {
  assert.equal(broadConvergence.intentType, "activity");
}

const strictUnknownNoFocus = verifyDiscoveryResults({
  domain: "activity",
  items: [
    {
      row: {
        name: "Generic Riverside Spot",
        categoryLabel: null,
        cuisineHint: null,
        address: "Osaka",
      },
    },
  ],
  focusTokens: [],
  guardThreshold: 0.85,
});
assert.equal(strictUnknownNoFocus.kept.length, 0);
const relaxedUnknown = verifyDiscoveryResults({
  domain: "activity",
  items: strictUnknownNoFocus.removed,
  focusTokens: [],
  guardThreshold: 0.52,
});
assert.equal(relaxedUnknown.kept.length, 1);

console.log("test-activity-landmark-inventory: ok");
