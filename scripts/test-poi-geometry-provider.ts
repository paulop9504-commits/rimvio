#!/usr/bin/env npx tsx
/**
 * POI geometry Reality Provider — OSM / cached footprint → glow Projection.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  resolveRealityProvider,
  type RealityNeed,
} from "@/lib/reality-provider";
import { acquireCachedPoiGeometry } from "@/lib/reality-provider/cached-poi-geometry";
import {
  boundingBoxToPolygon,
  normalizePoiFootprint,
} from "@/lib/reality-provider/normalize-poi-geometry";
import { acquirePoiGeometry } from "@/lib/reality-provider/acquire-poi-geometry";
import { projectPoiGeometryAbsorb } from "@/lib/reality-provider/project-poi-geometry";
import {
  clearPoiGeometryOverlayForTests,
  getPoiGeometryOverlay,
} from "@/lib/reality-provider/poi-geometry-store";
import { openMapContextWorkspace } from "@/lib/context-workspace/open-map-workspace";
import {
  clearContextWorkspace,
  readContextWorkspace,
} from "@/lib/context-workspace/workspace-store";

const need: RealityNeed = {
  needId: "poi_geometry",
  utterance: "오사카성 위치 찾아줘",
  placeQuery: "오사카성",
  geoId: "geo:jp:osaka:osaka-castle",
  lat: 34.6873,
  lng: 135.5262,
};

const resolution = resolveRealityProvider(need);
assert.equal(resolution.selected?.providerId, "osm");
assert.ok(resolution.candidates.some((c) => c.providerId === "cached_overlay"));

const bboxPoly = boundingBoxToPolygon([34.68, 34.69, 135.52, 135.53]);
assert.equal(bboxPoly.type, "Polygon");
assert.equal(bboxPoly.coordinates[0]!.length, 5);

const fromOsmShape = normalizePoiFootprint({
  geoId: "geo:test",
  labelKo: "테스트성",
  lat: 34.687,
  lng: 135.526,
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [135.52, 34.68],
        [135.53, 34.68],
        [135.53, 34.69],
        [135.52, 34.69],
        [135.52, 34.68],
      ],
    ],
  },
  boundingbox: null,
  providerId: "osm",
});
assert.ok(fromOsmShape);
assert.equal(fromOsmShape!.geometry.type, "Polygon");

const fromBboxOnly = normalizePoiFootprint({
  geoId: "geo:bbox",
  labelKo: "박스",
  lat: 34.685,
  lng: 135.525,
  geometry: { type: "Point", coordinates: [135.525, 34.685] },
  boundingbox: [34.68, 34.69, 135.52, 135.53],
  providerId: "osm",
});
assert.ok(fromBboxOnly);
assert.equal(fromBboxOnly!.geometry.type, "Polygon");

const cached = acquireCachedPoiGeometry({
  query: "오사카성",
  geoId: "geo:jp:osaka:osaka-castle",
});
assert.ok(cached);
assert.equal(cached!.providerId, "cached_overlay");
assert.equal(cached!.geometry.type, "Polygon");

const CTX = "ctx_poi_geometry_test";
clearContextWorkspace(CTX);
clearPoiGeometryOverlayForTests();
openMapContextWorkspace({
  contextEventId: CTX,
  domain: "poi",
  query: "오사카성",
  summaryKo: "오사카성 위치",
  candidates: [],
});

async function main() {
  const acquired = await acquirePoiGeometry({
    need,
    providerId: "cached_overlay",
  });
  assert.equal(acquired.ok, true);
  if (!acquired.ok) throw new Error("acquire failed");

  const projected = projectPoiGeometryAbsorb({
    need,
    object: acquired.object,
    contextEventId: CTX,
  });
  assert.match(projected.statusKo, /오사카성|영역/);
  assert.equal(projected.providerId, "cached_overlay");

  const overlay = getPoiGeometryOverlay();
  assert.ok(overlay);
  assert.equal(overlay!.contextEventId, CTX);
  assert.equal(overlay!.geoId, "geo:jp:osaka:osaka-castle");

  const state = readContextWorkspace(CTX);
  assert.ok(state?.patches?.some((p) => p.kind === "absorb_geometry"));

  const root = process.cwd();
  const placeLocate = readFileSync(
    join(root, "lib/context-workspace/reality-anchor/place-locate.ts"),
    "utf8",
  );
  assert.ok(placeLocate.includes("absorbPoiGeometryForPlace"));

  const mapView = readFileSync(
    join(root, "components/context-workspace/workspace-map-view.tsx"),
    "utf8",
  );
  assert.ok(mapView.includes("syncWorkspacePoiGeometryGlow"));

  const glow = readFileSync(
    join(
      root,
      "lib/context-workspace/map/sync-workspace-poi-geometry-glow.ts",
    ),
    "utf8",
  );
  assert.ok(glow.includes("WORKSPACE_POI_GEOMETRY_GLOW_ID"));
  assert.ok(glow.includes("fill-opacity"));

  clearPoiGeometryOverlayForTests();
  clearContextWorkspace(CTX);

  console.log("ok — poi-geometry Reality Provider (OSM footprint glow)");
}

void main();
