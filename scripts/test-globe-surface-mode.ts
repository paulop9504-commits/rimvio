#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildFlatMapHandoffView,
  commitFlatMapPan,
  flatMapZoomFromGlobeAltitude,
  FLAT_MAP_STREET_ZOOM,
  panFlatMapView,
  panFlatMapViewDelta,
  resolveFlatMapSlippyZoom,
  shouldExitFlatMapToGlobe3d,
} from "../lib/globe/flat-map-view";
import {
  GLOBE_FLAT_ENTER_ALTITUDE,
  resolveGlobeSurfaceMode,
  shouldEnterFlatMap,
} from "../lib/globe/resolve-globe-surface-mode";

assert.equal(resolveGlobeSurfaceMode("globe3d", { altitude: 0.6, detailLevel: "region" }), "flat2d");
assert.equal(resolveGlobeSurfaceMode("globe3d", { altitude: 0.45, detailLevel: "region" }), "flat2d");
assert.equal(resolveGlobeSurfaceMode("globe3d", { altitude: 0.14, detailLevel: "city" }), "flat2d");
assert.equal(
  resolveGlobeSurfaceMode("globe3d", { altitude: GLOBE_FLAT_ENTER_ALTITUDE - 0.01 }),
  "flat2d",
);
assert.equal(resolveGlobeSurfaceMode("flat2d", { altitude: 0.2 }), "flat2d");
assert.equal(shouldEnterFlatMap({ altitude: 0.2, detailLevel: "city" }), true);

assert.ok(resolveFlatMapSlippyZoom(2.4) >= 14);
assert.ok(resolveFlatMapSlippyZoom(4.2) >= 19);
assert.ok(flatMapZoomFromGlobeAltitude(0.02) > flatMapZoomFromGlobeAltitude(0.08));

const panned = panFlatMapView({ lat: 36.35, lng: 127.3, zoom: 2.5 }, 120, 40);
assert.ok(Math.abs(panned.lat - 36.35) > 0.0001);

const dragged = commitFlatMapPan(
  panFlatMapViewDelta({ lat: 36.35, lng: 127.3, zoom: 2.5 }, 80, 30),
);
assert.ok(Math.abs(dragged.lat - 36.35) > 0.0001);
assert.equal(dragged.panPxX ?? 0, 0);
assert.ok(shouldExitFlatMapToGlobe3d(1.1));
assert.ok(!shouldExitFlatMapToGlobe3d(1.25));
assert.equal(buildFlatMapHandoffView({ lat: 37.5, lng: 127.0 }).zoom, FLAT_MAP_STREET_ZOOM);

console.log("test-globe-surface-mode: ok");
