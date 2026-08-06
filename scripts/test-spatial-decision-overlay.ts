#!/usr/bin/env npx tsx
/**
 * Spatial Decision Overlay — zone + badges + primary float (Rimvio style).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildIntentDecisionFacetProjection } from "@/lib/context-workspace/projection/build-intent-decision-facets";
import { buildSpatialDecisionOverlay } from "@/lib/context-workspace/projection/build-spatial-decision-overlay";
import { createCirclePolygonGeoJSON } from "@/lib/context-workspace/map/create-circle-polygon-geojson";
import type { MobileWorkspaceEntity } from "@/lib/mobile-workspace/types";

const entity: MobileWorkspaceEntity = {
  id: "stendhal",
  kind: "hotel",
  title: "STENDHAL GUESTHOUSE",
  subtitleKo: "난바 · 캡슐",
  lat: 34.667,
  lng: 135.501,
  priceLabelKo: "¥9,800",
  score: 46,
  thumbnailUrl: null,
  galleryUrls: null,
  isSlotSkeleton: false,
};

const projection = buildIntentDecisionFacetProjection({
  entity,
  relations: [
    {
      id: "r1",
      kind: "nearby",
      fromId: "stendhal",
      toId: "namba",
      labelKo: "난바역",
      meters: 80,
      walkMinutes: 1,
    },
  ],
  intentText: "난바역 근처 가성비 캡슐호텔",
  realityPlan: {
    stayType: "capsule",
    maxPriceBand: 2,
    minRating: null,
    stationNear: true,
    onsenRequired: false,
    editCount: 1,
    lastEditKo: "캡슐",
    updatedAtIso: new Date().toISOString(),
  },
  query: "오사카 숙소",
});

const overlay = buildSpatialDecisionOverlay({
  entity,
  projection,
  relations: [
    {
      id: "r1",
      kind: "nearby",
      fromId: "stendhal",
      toId: "namba",
      labelKo: "난바역",
      meters: 80,
      walkMinutes: 1,
    },
  ],
  zoneCenter: { lat: 34.6663, lng: 135.5016 },
  zoneNameKo: "난바역",
});

assert.ok(overlay.anchorZone);
assert.match(overlay.anchorZone!.nameKo, /난바/);
assert.ok(overlay.anchorZone!.radiusMeters >= 80);
assert.equal(overlay.target.id, "stendhal");
assert.ok(overlay.target.reasonsKo.length >= 1);
assert.ok(overlay.target.badgesKo.some((b) => /도보|가성비|캡슐|Match/u.test(b.labelKo)));

const circle = createCirclePolygonGeoJSON({
  lat: 34.6663,
  lng: 135.5016,
  radiusMeters: 400,
});
assert.equal(circle.type, "FeatureCollection");
assert.equal(circle.features[0]?.geometry.type, "Polygon");
assert.ok(
  (circle.features[0]?.geometry as GeoJSON.Polygon).coordinates[0]!.length >=
    16,
);

const root = process.cwd();
const overlayUi = readFileSync(
  join(root, "components/context-workspace/object-decision-spoke-overlay.tsx"),
  "utf8",
);
assert.ok(overlayUi.includes("data-spatial-decision-chip"));
assert.ok(overlayUi.includes("data-spatial-why-highlight"));
assert.ok(overlayUi.includes("data-why-highlight-only"));
assert.ok(!overlayUi.includes("data-spatial-decision-float"));
assert.ok(overlayUi.includes("backdrop-blur"));
assert.ok(!overlayUi.includes("Gemini Decision"));
assert.ok(
  overlayUi.includes("Never render Price") ||
    overlayUi.includes("Why highlight only") ||
    overlayUi.includes("ONE glow card"),
);

const sync = readFileSync(
  join(root, "lib/context-workspace/map/sync-workspace-anchor-zone.ts"),
  "utf8",
);
assert.ok(sync.includes("WORKSPACE_ANCHOR_ZONE_FILL_ID"));
assert.ok(sync.includes("#3182f6"));

const mapView = readFileSync(
  join(root, "components/context-workspace/workspace-map-view.tsx"),
  "utf8",
);
assert.ok(mapView.includes("syncWorkspaceAnchorZone"));
assert.ok(mapView.includes("spatialDecisionOverlay"));

console.log("ok — spatial decision overlay (Rimvio glass + zone)");
