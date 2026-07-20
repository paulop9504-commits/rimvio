#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { isScoutMapRevealUtterance } from "../lib/globe/context-condition-ai/is-scout-map-reveal-utterance";
import { computeLodgingDiscoveryBounds } from "../lib/globe/lodging/compute-lodging-discovery-bounds";
import { GLOBE_ALTITUDE } from "../lib/globe/globe-zoom-levels";

assert.equal(isScoutMapRevealUtterance("지도에서 보여줘"), true);
assert.equal(isScoutMapRevealUtterance("지도에 보여줘"), true);
assert.equal(isScoutMapRevealUtterance("맵에서 표시해줘"), true);
assert.equal(isScoutMapRevealUtterance("show on the map"), true);
assert.equal(isScoutMapRevealUtterance("더 싸게"), false);
assert.equal(isScoutMapRevealUtterance(""), false);

const wide = computeLodgingDiscoveryBounds({
  user: { lat: 34.66, lng: 135.5 },
  lodging: [
    { lat: 34.66, lng: 135.5 },
    { lat: 35.0, lng: 136.0 },
  ],
  radiusM: 2500,
});
assert.ok(wide);
assert.ok(wide!.altitude <= GLOBE_ALTITUDE.city);

console.log("test-scout-map-reveal: ok");
