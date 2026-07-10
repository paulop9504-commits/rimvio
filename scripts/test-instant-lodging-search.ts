#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  isInstantLodgingSearch,
  requiresLodgingBookingSlots,
} from "../lib/globe/context-condition-ai/instant-lodging-search";
import { assessIntentConvergence } from "../lib/globe/context-condition-ai/intent-convergence/assess-intent-convergence";
import { resolveLocalDiscoveryAction } from "../lib/globe/context-condition-ai/resolve-local-discovery-action";

assert.equal(isInstantLodgingSearch("주변 호텔 찾아줘"), true);
assert.equal(isInstantLodgingSearch("호텔 예약"), false);
assert.equal(requiresLodgingBookingSlots("호텔 예약 2박"), true);

const convergence = assessIntentConvergence({
  message: "주변 호텔 보여줘",
  answers: {},
  askedAxisIds: [],
});
assert.equal(convergence.shouldAsk, false);

const resolved = resolveLocalDiscoveryAction({
  message: "주변 호텔",
  mobilityConfidence: 0.9,
  budgetConfidence: 0.9,
  foodConfidence: 0.9,
  lodgingConfidence: 0.9,
});
assert.equal(resolved.status, "ready");
assert.ok(resolved.spec);
assert.deepEqual([...resolved.spec.resourceTypes], ["hotel"]);

console.log("test-instant-lodging-search: ok");
