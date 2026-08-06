#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { OSAKA_METRO_LINE_IDS } from "@/lib/geo/osaka-metro/line-catalog";

const root = process.cwd();
const raw = readFileSync(join(root, "public/geo/osaka_metro.geojson"), "utf8");
const geo = JSON.parse(raw) as {
  type: string;
  features: Array<{
    properties?: { lineId?: string; color?: string };
    geometry?: { type: string; coordinates: number[][] };
  }>;
};

assert.equal(geo.type, "FeatureCollection");
assert.ok(geo.features.length >= 1);

const ids = new Set(
  geo.features.map((f) => f.properties?.lineId).filter(Boolean),
);
assert.ok(ids.has("midosuji"), "midosuji geometry required");

const midosuji = geo.features.find((f) => f.properties?.lineId === "midosuji")!;
assert.equal(midosuji.properties?.color, "#E60012");
assert.equal(midosuji.geometry?.type, "LineString");
assert.ok((midosuji.geometry?.coordinates.length ?? 0) >= 4);
const [lng, lat] = midosuji.geometry!.coordinates[0]!;
assert.ok(lng > 130 && lng < 140, "lng first (GeoJSON order)");
assert.ok(lat > 30 && lat < 40, "lat second");

for (const id of OSAKA_METRO_LINE_IDS) {
  assert.ok(ids.has(id), `missing geometry for ${id}`);
}

const sync = readFileSync(
  join(root, "lib/context-workspace/map/sync-osaka-metro-lines.ts"),
  "utf8",
);
assert.ok(sync.includes("OSAKA_METRO_SOURCE_ID"));
assert.ok(sync.includes("rimvio-osaka-metro"));
assert.ok(
  sync.includes("syncOsakaMetroLineLabels"),
  "metro sync must place Hangul line-name labels",
);
assert.ok(
  sync.includes("syncOsakaMetroStationLabels"),
  "metro sync must place station name chips",
);

const mapView = readFileSync(
  join(root, "components/context-workspace/workspace-map-view.tsx"),
  "utf8",
);
assert.ok(
  mapView.includes("OsakaMetroLineLegend"),
  "workspace map must show metro legend",
);

console.log("ok — osaka metro geojson");
