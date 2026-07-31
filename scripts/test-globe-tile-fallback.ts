#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resolveGlobeTileFallbackUrls } from "../lib/experience-graph/resolve-globe-tile-fallback-urls";

const voyager = resolveGlobeTileFallbackUrls({
  z: 11,
  x: 985,
  y: 818,
  style: "voyager",
});
assert.ok(voyager.length >= 2);
assert.match(voyager[0]!, /basemaps\.cartocdn\.com/);
assert.match(voyager[1]!, /tile\.openstreetmap\.org/);

const sat = resolveGlobeTileFallbackUrls({
  z: 6,
  x: 54,
  y: 26,
  style: "satellite",
});
assert.equal(sat.length, 0);

console.log("test-globe-tile-fallback: ok");
