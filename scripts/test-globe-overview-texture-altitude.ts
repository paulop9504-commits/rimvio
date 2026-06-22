#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  GLOBE_OVERVIEW_TEXTURE_MAX_ALTITUDE,
  shouldApplyGlobeOverviewTexture,
} from "../lib/globe/globe-overview-texture-altitude";

assert.equal(GLOBE_OVERVIEW_TEXTURE_MAX_ALTITUDE, 0.42);
assert.equal(shouldApplyGlobeOverviewTexture(0.43), true);
assert.equal(shouldApplyGlobeOverviewTexture(0.42), true);
assert.equal(shouldApplyGlobeOverviewTexture(0.41), false);
assert.equal(shouldApplyGlobeOverviewTexture(0.004), false);

console.log("test-globe-overview-texture-altitude: ok");
