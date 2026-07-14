/**
 * Station + brand + bare matcha slot regression.
 */

import assert from "node:assert/strict";
import { classifyContextConditionAnchorRequest } from "../lib/globe/context-condition-ai/classify-context-condition-anchor-request";
import { isAmbiguousDiscoveryIntent } from "../lib/globe/context-condition-ai/is-cross-domain-discovery-search";
import { isInstantEaterySearch } from "../lib/globe/context-condition-ai/instant-eatery-search";
import { parseSingleCuisineFocus } from "../lib/globe/context-condition-ai/parse-cuisine-candidates";
import { parseFoodBrandFocus } from "../lib/globe/context-condition-ai/parse-food-brand-focus";
import { parseUtteranceIntentSlots } from "../lib/globe/context-condition-ai/utterance-intent-slots";
import { resolveDiscoveryOriginFromUtterance } from "../lib/globe/context-condition-ai/resolve-discovery-origin-from-utterance";
import { resolveSpatialTargetFromText } from "../lib/globe/spatial/resolve-spatial-target-from-text";

assert.equal(parseSingleCuisineFocus("도쿄역 근처 말차 맛집 찾어줘"), "말차");
assert.equal(
  parseFoodBrandFocus("도쿄역 근처 맥도날드 찾어줘")?.queryKo,
  "맥도날드",
);

const matchaSlots = parseUtteranceIntentSlots("도쿄역 근처 말차 맛집 찾어줘");
assert.equal(matchaSlots.dishFocus, "말차");
assert.equal(matchaSlots.stationHint, "도쿄역");

const macSlots = parseUtteranceIntentSlots("도쿄역 근처 맥도날드 찾어줘");
assert.equal(macSlots.dishFocus, "맥도날드");
assert.equal(macSlots.brandFocus, "맥도날드");
assert.equal(isAmbiguousDiscoveryIntent("도쿄역 근처 맥도날드 찾어줘"), false);
assert.equal(isInstantEaterySearch("도쿄역 근처 맥도날드 찾어줘"), true);

const macClassify = classifyContextConditionAnchorRequest(
  "도쿄역 근처 맥도날드 찾어줘",
);
assert.equal(macClassify.eateryNearby, true);
assert.equal(macClassify.lodgingSimilar, false);

const station = resolveSpatialTargetFromText("도쿄역");
assert.ok(station);
assert.equal(station?.label, "도쿄역");
assert.ok(Math.abs((station?.lng ?? 0) - 139.767) < 0.01);

const origin = resolveDiscoveryOriginFromUtterance(
  "도쿄역 근처 맥도날드 찾어줘",
  null,
);
assert.equal(origin?.regionLabel, "도쿄역");
assert.ok((origin?.radiusM ?? 0) >= 1200);

console.log("test-station-brand-eatery-focus: ok");
