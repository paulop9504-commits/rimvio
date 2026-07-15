/**
 * Dual-domain: 말차 아이스크림 맛집 + 캡슐 호텔 in one utterance.
 */
import assert from "node:assert/strict";
import { hasConcurrentLodgingAndEaterySearchCues } from "../lib/globe/context-condition-ai/concurrent-lodging-eatery-cues";
import { resolveLocalDiscoveryAction } from "../lib/globe/context-condition-ai/resolve-local-discovery-action";
import { isEateryPrepUtterance } from "../lib/globe/eatery-prep/is-eatery-prep-utterance";
import { isLodgingPrepUtterance } from "../lib/globe/lodging-prep/is-lodging-prep-utterance";
import {
  buildScoutNarrationPlan,
  narrateScoutPlan,
  objectParticleKo,
} from "../lib/globe/narrator-engine";
import { groupDiscoveryItemsBySector } from "../lib/globe/intelligent-pin/build-infinite-discovery-feed-cards";

const MSG = "말차아이스크림집이랑 캡슐호텔 찾아줘 가성비 좋은곳으로";

assert.equal(hasConcurrentLodgingAndEaterySearchCues(MSG), true);
assert.equal(isLodgingPrepUtterance(MSG), true);
assert.equal(isEateryPrepUtterance(MSG), true);

const action = resolveLocalDiscoveryAction({ message: MSG });
assert.equal(action.status, "ready");
if (action.status !== "ready") {
  throw new Error("expected ready");
}
assert.deepEqual([...action.spec.resourceTypes].sort(), ["hotel", "restaurant"]);
assert.ok(
  action.spec.eateryFocus && /말차/.test(action.spec.eateryFocus),
  `eateryFocus=${action.spec.eateryFocus}`,
);
assert.equal(action.spec.lodgingStayType, "capsule");

const plan = buildScoutNarrationPlan({
  message: MSG,
  spec: action.spec,
  anchorLabelKo: "도쿄",
});
assert.equal(plan.domain, "Mixed");
assert.ok(plan.entityLabelKo && /말차/.test(plan.entityLabelKo));
assert.ok(plan.entityLabelKo && /캡슐/.test(plan.entityLabelKo));
assert.equal(/말차 숙소/.test(plan.entityLabelKo ?? ""), false);

const narration = narrateScoutPlan(plan);
assert.match(narration.understandingKo, /말한 섹터를 함께|맛집|숙소/);
assert.equal(/말차 숙소/.test(narration.understandingKo), false);
assert.equal(/숙소을/.test(narration.understandingKo), false);
assert.match(narration.understandingKo, /도쿄/);
assert.ok(
  narration.progressSteps.some((s) => /병렬|말차|캡슐/.test(s.textKo)),
);

// Lodging-only must not narrate dish as lodging entity
const lodgingOnly = resolveLocalDiscoveryAction({
  message: "캡슐호텔 찾아줘",
});
assert.equal(lodgingOnly.status, "ready");
if (lodgingOnly.status === "ready") {
  const lodgingPlan = buildScoutNarrationPlan({
    message: "캡슐호텔 찾아줘",
    spec: lodgingOnly.spec,
    anchorLabelKo: "도쿄",
  });
  assert.equal(lodgingPlan.domain, "Lodging");
  assert.equal(lodgingPlan.entityLabelKo, "캡슐 호텔");
  const lodgingNarration = narrateScoutPlan(lodgingPlan);
  assert.equal(/말차/.test(lodgingNarration.understandingKo), false);
  assert.equal(/숙소을/.test(lodgingNarration.understandingKo), false);
}

assert.equal(objectParticleKo("숙소"), "를");
assert.equal(objectParticleKo("맛집"), "을");
assert.equal(objectParticleKo("호텔"), "을");

// Single-domain eatery unchanged
assert.equal(
  hasConcurrentLodgingAndEaterySearchCues("말차 아이스크림 찾아줘"),
  false,
);

const ordered = groupDiscoveryItemsBySector(
  [
    {
      resourceId: "a:lodging:1",
      kind: "lodging",
      placeId: "1",
      title: "캡슐",
      score100: 80,
      detailReasonLine: "",
      accent: "green",
      thumbnailUrl: null,
      lat: 1,
      lng: 1,
      carouselIndex: 0,
    },
    {
      resourceId: "a:eatery:2",
      kind: "eatery",
      placeId: "2",
      title: "말차",
      score100: 90,
      detailReasonLine: "",
      accent: "orange",
      thumbnailUrl: null,
      lat: 2,
      lng: 2,
      carouselIndex: 1,
    },
  ],
  MSG,
);
assert.equal(ordered[0]?.kind, "eatery");
assert.equal(ordered[1]?.kind, "lodging");

console.log("test-concurrent-lodging-eatery-cues: ok");
