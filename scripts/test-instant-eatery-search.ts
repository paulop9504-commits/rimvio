import assert from "node:assert/strict";
import {
  isInstantEaterySearch,
  matchesInstantEateryTyping,
  resolveInstantEateryFocus,
} from "../lib/globe/context-condition-ai/instant-eatery-search";
import { resolveLocalDiscoveryAction } from "../lib/globe/context-condition-ai/resolve-local-discovery-action";
import { assessIntentConvergence } from "../lib/globe/context-condition-ai/intent-convergence/assess-intent-convergence";

assert.equal(resolveInstantEateryFocus("초밥집 지도에 표시"), "스시 초밥");
assert.ok(isInstantEaterySearch("초밥집 지도에 표시"));
assert.ok(isInstantEaterySearch("피자집"));
assert.ok(isInstantEaterySearch("근처 맛집 지도에 꽂아줘"));
assert.equal(isInstantEaterySearch("맛집"), false);
assert.equal(isInstantEaterySearch("편의점"), false);

assert.ok(matchesInstantEateryTyping("초밥"));
assert.ok(matchesInstantEateryTyping("맛집 지"));

const convergence = assessIntentConvergence({
  message: "초밥집 지도에 표시",
  answers: {},
  askedAxisIds: [],
});
assert.equal(convergence.shouldAsk, false);

const resolved = resolveLocalDiscoveryAction({
  message: "초밥집 지도에 표시",
  answers: {},
});
assert.equal(resolved.status, "ready");
if (resolved.status === "ready") {
  assert.deepEqual(resolved.spec.resourceTypes, ["restaurant"]);
  assert.equal(resolved.spec.eateryFocus, "스시 초밥");
}

console.log("test-instant-eatery-search: ok");
