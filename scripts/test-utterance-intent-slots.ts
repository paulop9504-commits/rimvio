/**
 * Utterance → Intent slots + turn accumulation + convergence cap.
 */

import assert from "node:assert/strict";
import { assessIntentConvergence } from "../lib/globe/context-condition-ai/intent-convergence/assess-intent-convergence";
import {
  emptyScoutTurnConstraints,
  mergeScoutTurnConstraints,
  resolveAccumulatedEateryFocus,
} from "../lib/globe/context-condition-ai/scout-turn-constraints";
import {
  parseUtteranceIntentSlots,
  utteranceHasConcreteDishSlot,
} from "../lib/globe/context-condition-ai/utterance-intent-slots";
import { refineLocalDiscoverySpec } from "../lib/globe/context-condition-ai/resolve-local-discovery-action";

const matcha =
  "내가 녹차랑 말차를 좋아하는데 녹진한 말차 아이스크림 맛집 좀 찾아줘";

const slots = parseUtteranceIntentSlots(matcha);
assert.equal(slots.dishFocus, "말차 아이스크림");
assert.equal(slots.cuisineId, "matcha_icecream");
assert.equal(utteranceHasConcreteDishSlot(matcha), true);
assert.equal(utteranceHasConcreteDishSlot("맛집 찾아줘"), false);

const afterMatcha = mergeScoutTurnConstraints({
  prior: emptyScoutTurnConstraints(),
  message: matcha,
  slots,
});
assert.equal(afterMatcha.eateryFocus, "말차 아이스크림");
assert.equal(afterMatcha.menuFocusId, "matcha_icecream");

const dessertOnly = mergeScoutTurnConstraints({
  prior: afterMatcha,
  message: "아니 디저트만 보여줘",
});
assert.equal(dessertOnly.eateryFocus, "디저트");

assert.equal(
  resolveAccumulatedEateryFocus({
    message: "가성비로 다시",
    prior: afterMatcha,
    previousSpec: {
      version: 1,
      resourceTypes: ["restaurant"],
      transport: "walk",
      budget: "medium",
      vibe: "popular",
      lodgingKind: "any",
      radiusM: 1200,
      eateryFocus: "말차 아이스크림",
    },
  }),
  "말차 아이스크림",
);

assert.equal(
  resolveAccumulatedEateryFocus({
    message: "말고 라멘 찾아줘",
    prior: afterMatcha,
  }),
  "라멘",
);

const refined = refineLocalDiscoverySpec(
  {
    version: 1,
    resourceTypes: ["restaurant"],
    transport: "walk",
    budget: "medium",
    vibe: "popular",
    lodgingKind: "any",
    radiusM: 1200,
    eateryFocus: "말차 아이스크림",
  },
  "아니 디저트만",
);
assert.equal(refined.eateryFocus, "디저트");

const skipAsk = assessIntentConvergence({
  message: matcha,
  answers: {},
  askedAxisIds: [],
});
assert.equal(skipAsk.shouldAsk, false);

const vagueCafe = assessIntentConvergence({
  message: "카페",
  answers: {},
  askedAxisIds: [],
});
// Bare cafe may ask once — never more than CAP.
if (vagueCafe.shouldAsk) {
  const second = assessIntentConvergence({
    message: "카페",
    answers: {},
    askedAxisIds: [vagueCafe.topAxis.id],
  });
  assert.equal(second.shouldAsk, false);
}

console.log("test-utterance-intent-slots: ok");
