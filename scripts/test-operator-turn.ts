import assert from "node:assert/strict";
import {
  gateOperatorTurnSync,
  mapClassifyToOperatorTool,
  OPERATOR_FIXED_TOOLS,
  isOperatorWhitelistTool,
} from "../lib/globe/operator-turn";
import type { OperatorTurnSsot } from "../lib/globe/operator-turn";

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
  explorationMode: "convergent",
};

assert.ok(OPERATOR_FIXED_TOOLS.includes("scout"));
assert.equal(isOperatorWhitelistTool("scout"), true);
assert.equal(isOperatorWhitelistTool("web_search"), false);

assert.equal(gateOperatorTurnSync({ text: "", ssot: emptySsot }).tool, "noop");

const lensPlan = gateOperatorTurnSync({
  text: "a 렌즈 반경 1km 올려",
  ssot: emptySsot,
});
assert.equal(lensPlan.tool, "lens_command");

const filterEmpty = gateOperatorTurnSync({
  text: "맛집만",
  ssot: emptySsot,
});
assert.equal(filterEmpty.tool, "scout");
if (filterEmpty.tool === "scout") {
  assert.equal(filterEmpty.reason, "narrow_cue_without_slice");
}

const withEatery: OperatorTurnSsot = {
  ...emptySsot,
  reelItemCount: 2,
  reelKinds: ["eatery", "activity"],
};
const filterHit = gateOperatorTurnSync({
  text: "맛집만",
  ssot: withEatery,
});
assert.equal(filterHit.tool, "filter_inventory");
if (filterHit.tool === "filter_inventory") {
  assert.equal(filterHit.kindFilter, "eatery");
}

assert.equal(
  gateOperatorTurnSync({ text: "맛집", ssot: emptySsot }).tool,
  "defer_classify",
);

const instantPoi = gateOperatorTurnSync({
  text: "편의점",
  ssot: emptySsot,
});
assert.equal(instantPoi.tool, "scout");
if (instantPoi.tool === "scout") {
  assert.equal(instantPoi.reason, "instant_poi_search");
}

const instantLodging = gateOperatorTurnSync({
  text: "호텔",
  ssot: emptySsot,
});
assert.equal(instantLodging.tool, "scout");
if (instantLodging.tool === "scout") {
  assert.equal(instantLodging.reason, "instant_lodging_search");
}

const instantEatery = gateOperatorTurnSync({
  text: "초밥집 지도에 표시",
  ssot: emptySsot,
});
assert.equal(instantEatery.tool, "scout");
if (instantEatery.tool === "scout") {
  assert.equal(instantEatery.reason, "instant_eatery_search");
}

assert.equal(mapClassifyToOperatorTool("chat").tool, "small_talk");
assert.equal(mapClassifyToOperatorTool("task").tool, "task_injection");
assert.equal(mapClassifyToOperatorTool("search").tool, "scout");

const afterSkipLens = gateOperatorTurnSync({
  text: "a 렌즈 반경 1km 올려",
  ssot: emptySsot,
  skipLens: true,
});
assert.equal(afterSkipLens.tool, "defer_classify");

console.log("test-operator-turn: ok");
