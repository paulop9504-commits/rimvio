import assert from "node:assert/strict";
import {
  INSTANT_POI_PIN_CAP,
  INSTANT_POI_RADIUS_M,
  isInstantPoiSearch,
  matchesInstantPoiTyping,
  resolveInstantPoiFocus,
} from "../lib/globe/context-condition-ai/instant-poi-search";
import { gateOperatorTurnSync } from "../lib/globe/operator-turn";
import type { OperatorTurnSsot } from "../lib/globe/operator-turn";
import { resolveLocalDiscoveryAction } from "../lib/globe/context-condition-ai/resolve-local-discovery-action";

assert.equal(resolveInstantPoiFocus("편의"), "편의점");
assert.equal(resolveInstantPoiFocus("편의점 찾아줘"), "편의점");
assert.equal(resolveInstantPoiFocus("근처 약국"), "약국");
assert.ok(isInstantPoiSearch("편의점"));
assert.ok(matchesInstantPoiTyping("편의"));

const emptySsot: OperatorTurnSsot = {
  contextEventId: "evt-1",
  scoutContract: null,
  selectedAnchor: null,
  lensSession: null,
  lastBatch: null,
  reelKinds: [],
  reelItemCount: 0,
  composeTail: [],
  hasActiveSpec: false,
};

const instantPlan = gateOperatorTurnSync({
  text: "편의점 찾아줘",
  ssot: emptySsot,
});
assert.equal(instantPlan.tool, "scout");
if (instantPlan.tool === "scout") {
  assert.equal(instantPlan.reason, "instant_poi_search");
}

const resolved = resolveLocalDiscoveryAction({
  message: "편의",
  answers: {},
});
assert.equal(resolved.status, "ready");
if (resolved.status === "ready") {
  assert.ok(resolved.spec.resourceTypes.includes("amenity"));
  assert.equal(resolved.spec.activityFocus, "편의점");
  assert.equal(resolved.spec.radiusM, INSTANT_POI_RADIUS_M);
}

assert.ok(INSTANT_POI_PIN_CAP >= 6);

console.log("test-instant-poi-search: ok");
