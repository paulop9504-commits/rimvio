#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  enterContextSoloStage,
  exitContextSoloStage,
  isContextSoloStageActive,
  isGlobeSoloStagePolicy,
} from "../lib/globe/spatial-semantic/enter-context-solo-stage";
import {
  publishFocusGlobeProjection,
  readGlobeProjectionLayerPolicy,
  resetGlobeProjectionLayerPolicy,
} from "../lib/globe/spatial-semantic/globe-projection-layer-policy";

resetGlobeProjectionLayerPolicy();

enterContextSoloStage("trip-osaka");
assert.equal(readGlobeProjectionLayerPolicy().mode, "context_only");
assert.equal(readGlobeProjectionLayerPolicy().activeContextEventId, "trip-osaka");
assert.equal(isContextSoloStageActive("trip-osaka"), true);

publishFocusGlobeProjection({
  contextEventId: "trip-osaka",
  visiblePlaceIds: ["hotel-a"],
});
enterContextSoloStage("trip-osaka");
assert.equal(
  readGlobeProjectionLayerPolicy().mode,
  "focus",
  "re-enter same context must not clobber scout focus",
);
assert.deepEqual(readGlobeProjectionLayerPolicy().visiblePlaceIds, ["hotel-a"]);

enterContextSoloStage("trip-tokyo");
assert.equal(readGlobeProjectionLayerPolicy().mode, "context_only");
assert.equal(readGlobeProjectionLayerPolicy().activeContextEventId, "trip-tokyo");

exitContextSoloStage({ onlyIfContextEventId: "trip-osaka" });
assert.equal(
  readGlobeProjectionLayerPolicy().mode,
  "context_only",
  "exit onlyIf skips when another context owns the stage",
);

exitContextSoloStage({ onlyIfContextEventId: "trip-tokyo" });
assert.equal(readGlobeProjectionLayerPolicy().mode, "overview");
assert.equal(isContextSoloStageActive(), false);
assert.equal(isGlobeSoloStagePolicy(), false);

enterContextSoloStage("trip-osaka");
assert.equal(isGlobeSoloStagePolicy(), true);

console.log("test-enter-context-solo-stage: ok");
