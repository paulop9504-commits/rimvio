#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { classifyPlaceCategory } from "../lib/globe/context-condition-ai/discovery-guard/classify-place-category";
import { verifyDiscoveryResults } from "../lib/globe/context-condition-ai/discovery-guard/verify-discovery-results";
import { isExplicitActivityLandmarkQuery } from "../lib/globe/context-condition-ai/resolve-activity-landmark-inventory";
import { resolveLocalDiscoveryAction } from "../lib/globe/context-condition-ai/resolve-local-discovery-action";

assert.equal(isExplicitActivityLandmarkQuery("도쿄 디즈니"), true);
assert.equal(isExplicitActivityLandmarkQuery("도쿄 디즈니랜드"), true);
assert.equal(isExplicitActivityLandmarkQuery("Tokyo Disney"), true);
assert.equal(isExplicitActivityLandmarkQuery("유니버설 스튜디오"), true);
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
}

console.log("test-activity-landmark-inventory: ok");
