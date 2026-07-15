/**
 * Triple ask: budget hotel + activity + eatery — must not collapse to lodging-only.
 */
import assert from "node:assert/strict";
import {
  detectConcurrentDiscoveryDomains,
  hasConcurrentMultiDomainSearchCues,
  concurrentDiscoveryResourceTypes,
} from "../lib/globe/context-condition-ai/concurrent-lodging-eatery-cues";
import { resolveLocalDiscoveryAction } from "../lib/globe/context-condition-ai/resolve-local-discovery-action";
import { isInstantLodgingSearch } from "../lib/globe/context-condition-ai/instant-lodging-search";
import { shouldInterpretMessyInput } from "../lib/messy-prompt-interpreter/should-interpret-messy-input";
import { isResearchUtterance } from "../lib/research-engine/is-research-utterance";
import {
  buildScoutNarrationPlan,
  narrateScoutPlan,
} from "../lib/globe/narrator-engine";

const MSG = "하루 10만원대 호텔이랑 놀거리 그리고 맛집좀 추천해줘";

assert.equal(isInstantLodgingSearch(MSG), false);
assert.equal(hasConcurrentMultiDomainSearchCues(MSG), true);
assert.equal(shouldInterpretMessyInput(MSG), false);
assert.equal(isResearchUtterance(MSG), false);
assert.deepEqual(
  [...concurrentDiscoveryResourceTypes(MSG)].sort(),
  ["activity", "hotel", "restaurant"],
);
assert.equal(detectConcurrentDiscoveryDomains(MSG).length, 3);

const action = resolveLocalDiscoveryAction({ message: MSG });
assert.equal(action.status, "ready");
if (action.status !== "ready") {
  throw new Error("expected ready");
}
assert.deepEqual(
  [...action.spec.resourceTypes].sort(),
  ["activity", "hotel", "restaurant"],
);
assert.equal(action.spec.maxNightlyPriceKrw, 100_000);

const plan = buildScoutNarrationPlan({
  message: MSG,
  spec: action.spec,
  anchorLabelKo: "도쿄",
});
assert.equal(plan.domain, "Mixed");
assert.ok(plan.entityLabelKo && /호텔/.test(plan.entityLabelKo));
assert.ok(plan.entityLabelKo && /놀거리/.test(plan.entityLabelKo));
assert.ok(plan.entityLabelKo && /맛집/.test(plan.entityLabelKo));

const narration = narrateScoutPlan(plan);
assert.equal(/새로운 숙소 검색/.test(narration.understandingKo), false);
assert.match(narration.understandingKo, /말한 섹터를 함께|호텔/);
assert.ok(
  narration.progressSteps.some((s) => /병렬/.test(s.textKo)),
);

console.log("test-triple-domain-hotel-activity-eatery: ok");
