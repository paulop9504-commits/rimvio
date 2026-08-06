#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { JAPAN_METRO_LINE_IDS } from "../lib/geo/japan-metro/line-catalog";

const fc = JSON.parse(
  readFileSync(join(process.cwd(), "public/geo/japan_metro.geojson"), "utf8"),
) as {
  type: string;
  features: Array<{
    properties: { lineId: string; color: string };
    geometry: { type: string; coordinates: number[][] };
  }>;
};

assert.equal(fc.type, "FeatureCollection");
const ids = new Set(fc.features.map((f) => f.properties.lineId));
for (const id of JAPAN_METRO_LINE_IDS) {
  assert.ok(ids.has(id), `missing ${id}`);
}
for (const f of fc.features) {
  assert.equal(f.geometry.type, "LineString");
  assert.ok(f.geometry.coordinates.length >= 2);
}

console.log("japan-metro-geojson: ok");
