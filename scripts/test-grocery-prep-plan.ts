import assert from "node:assert/strict";
import { planOneShotGroceryPrep } from "../lib/globe/grocery-prep/plan-one-shot-grocery-prep";
import { isGroceryPrepUtterance } from "../lib/globe/grocery-prep/detect-grocery-prep-utterance";

const message = "찜닭 만들 거야, 식자재 장봐줘";
assert.equal(isGroceryPrepUtterance(message), true);

const plan = planOneShotGroceryPrep({ message });
assert.ok(plan);
assert.equal(plan!.state.dishId, "jjimdak");
assert.equal(plan!.state.ingredients.length, 8);
assert.equal(plan!.readyForScout, true);

console.log("test-grocery-prep-plan: ok");
