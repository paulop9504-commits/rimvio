#!/usr/bin/env npx tsx
/**
 * Korea rail GeoJSON — lineId ↔ catalog parity.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { KOREA_RAIL_LINE_IDS } from "../lib/geo/korea-rail/line-catalog";

const raw = readFileSync(
  join(process.cwd(), "public/geo/korea_rail.geojson"),
  "utf8",
);
const fc = JSON.parse(raw) as {
  type: string;
  features: Array<{
    properties: { lineId: string; color: string; nameKo: string };
    geometry: { type: string; coordinates: number[][] };
  }>;
};

assert.equal(fc.type, "FeatureCollection");
const ids = new Set(fc.features.map((f) => f.properties.lineId));
for (const id of KOREA_RAIL_LINE_IDS) {
  assert.ok(ids.has(id), `missing geojson for ${id}`);
}
for (const f of fc.features) {
  assert.equal(f.geometry.type, "LineString");
  assert.ok(f.geometry.coordinates.length >= 2);
  assert.ok(f.properties.color.startsWith("#"));
  assert.ok(f.properties.nameKo.length >= 2);
}

console.log("korea-rail-geojson: ok");
