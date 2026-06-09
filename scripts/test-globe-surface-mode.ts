#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  flatMapZoomFromGlobeAltitude,
  panFlatMapView,
  resolveFlatMapSlippyZoom,
  shouldExitFlatMapToGlobe3d,
} from "../lib/globe/flat-map-view";
import {
  GLOBE_FLAT_ENTER_ALTITUDE,
  GLOBE_FLAT_EXIT_ALTITUDE,
  resolveGlobeSurfaceMode,
} from "../lib/globe/resolve-globe-surface-mode";

assert.equal(resolveGlobeSurfaceMode("globe3d", 0.2), "globe3d");
assert.equal(resolveGlobeSurfaceMode("globe3d", GLOBE_FLAT_ENTER_ALTITUDE - 0.01), "flat2d");
assert.equal(resolveGlobeSurfaceMode("flat2d", 0.04), "flat2d");
assert.equal(resolveGlobeSurfaceMode("flat2d", GLOBE_FLAT_EXIT_ALTITUDE + 0.01), "globe3d");

assert.ok(resolveFlatMapSlippyZoom(2.4) >= 14);
assert.ok(resolveFlatMapSlippyZoom(4.2) >= 19);
assert.ok(flatMapZoomFromGlobeAltitude(0.02) > flatMapZoomFromGlobeAltitude(0.08));

const panned = panFlatMapView({ lat: 36.35, lng: 127.3, zoom: 2.5 }, 120, 40);
assert.ok(Math.abs(panned.lat - 36.35) > 0.0001);
assert.ok(shouldExitFlatMapToGlobe3d(1.3));

console.log("test-globe-surface-mode: ok");
