#!/usr/bin/env npx tsx
/**
 * Lodging stay-type why-intent — full catalog coverage + utterance overrides.
 */

import assert from "node:assert/strict";
import {
  LODGING_STAY_TYPES,
  parseLodgingStayTypeFromText,
} from "../lib/globe/lodging/lodging-stay-types";
import {
  assertLodgingStayWhyCoverage,
  LODGING_STAY_WHY_DEFAULTS,
  parseLodgingWhyFromUtterance,
  resolveLodgingWhyIntent,
} from "../lib/globe/lodging/resolve-lodging-why-intent";
import { inferLodgingPriorityFromContext } from "../lib/globe/lodging/score-lodging-row-dimensions";
import type { ContextInstance } from "../lib/context-instance/build-context-instance";

assertLodgingStayWhyCoverage();
assert.equal(
  Object.keys(LODGING_STAY_WHY_DEFAULTS).length,
  LODGING_STAY_TYPES.length,
);

/** Every stay type resolves with its SSOT primary. */
for (const stayType of LODGING_STAY_TYPES) {
  const expected = LODGING_STAY_WHY_DEFAULTS[stayType];
  const why = resolveLodgingWhyIntent({ stayType, utterance: "" });
  assert.equal(why.stayType, stayType);
  assert.equal(why.primary, expected.primary, stayType);
  assert.ok(why.reasonKo.trim().length > 0, stayType);
  assert.ok(why.reviewFocusOrder.length >= 3, stayType);
}

{
  const why = resolveLodgingWhyIntent({ utterance: "오사카 캡슐호텔" });
  assert.equal(why.stayType, "capsule");
  assert.equal(why.primary, "value");
  assert.equal(why.lodgingPriority, "price");
  assert.ok(why.reasonKo.includes("가성비"));
  assert.equal(why.reviewFocusOrder[0], "value");
}

{
  const why = resolveLodgingWhyIntent({
    utterance: "캡슐호텔 깨끗하고 조용한",
  });
  assert.equal(why.stayType, "capsule");
  assert.equal(why.primary, "clean");
  assert.equal(why.lodgingPriority, "quiet");
  assert.equal(why.reviewFocusOrder[0], "cleanliness");
}

{
  const why = resolveLodgingWhyIntent({ utterance: "료칸 체험" });
  assert.equal(why.stayType, "ryokan");
  assert.equal(why.primary, "experience");
  assert.equal(why.lodgingPriority, "aesthetic");
}

{
  const why = resolveLodgingWhyIntent({ utterance: "공항 호텔" });
  assert.equal(why.stayType, "airport_hotel");
  assert.equal(why.primary, "convenience");
}

{
  const why = resolveLodgingWhyIntent({ utterance: "한옥스테이" });
  assert.equal(why.stayType, "hanok");
  assert.equal(why.primary, "experience");
}

{
  const why = resolveLodgingWhyIntent({ utterance: "글램핑" });
  assert.equal(why.stayType, "glamping");
  assert.equal(why.primary, "experience");
}

{
  const why = resolveLodgingWhyIntent({ utterance: "에어비앤비 취사 가능한" });
  assert.equal(why.stayType, "airbnb");
  assert.equal(why.primary, "space");
  assert.equal(why.lodgingPriority, "family");
}

{
  const why = resolveLodgingWhyIntent({ utterance: "펜션 아이랑" });
  assert.equal(why.stayType, "pension");
  assert.equal(why.primary, "family");
}

{
  assert.equal(parseLodgingWhyFromUtterance("가성비 좋은"), "value");
  assert.equal(parseLodgingWhyFromUtterance("장기 세탁"), "space");
  assert.equal(parseLodgingStayTypeFromText("비즈니스 호텔"), "business_hotel");
  const biz = resolveLodgingWhyIntent({ utterance: "비즈니스 호텔" });
  assert.equal(biz.primary, "convenience");
}

{
  const ctx = {
    input: { message: "난바 캡슐호텔" },
    title: {
      rawTitle: "오사카 여행",
      normalizedTitle: "오사카 여행",
      companionMode: null,
      primaryPlaceHint: null,
      searchBias: { comfortBias: null },
    },
    travel: { destinationLabel: "오사카" },
  } as unknown as ContextInstance;
  assert.equal(inferLodgingPriorityFromContext(ctx), "price");
}

console.log("test-lodging-why-intent: ok");
