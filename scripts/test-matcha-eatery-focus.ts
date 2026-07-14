/**
 * Matcha ice cream utterance → eateryFocus (not generic 가성비 맛집).
 */

import assert from "node:assert/strict";
import {
  isSpecialtyDessertEateryFocus,
  parseCuisineCandidates,
  parseSingleCuisineFocus,
} from "../lib/globe/context-condition-ai/parse-cuisine-candidates";
import { resolveInstantEateryFocus } from "../lib/globe/context-condition-ai/instant-eatery-search";

const utterance =
  "내가 녹차랑 말차를 좋아하는데 녹진한 말차 아이스크림 맛집 좀 찾아줘";

assert.equal(parseSingleCuisineFocus(utterance), "말차 아이스크림");
assert.equal(resolveInstantEateryFocus(utterance), "말차 아이스크림");
assert.equal(isSpecialtyDessertEateryFocus("말차 아이스크림"), true);
assert.equal(isSpecialtyDessertEateryFocus("스시"), false);

const candidates = parseCuisineCandidates(utterance);
assert.equal(candidates.length, 1);
assert.equal(candidates[0]?.id, "matcha_icecream");
assert.ok(!candidates.some((row) => row.id === "dessert"));

assert.equal(
  parseSingleCuisineFocus("도쿄 피자 맛집 찾아줘"),
  "피자",
);

console.log("test-matcha-eatery-focus: ok");
