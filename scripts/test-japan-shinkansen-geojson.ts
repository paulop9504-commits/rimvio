#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { JAPAN_SHINKANSEN_LINE_IDS } from "@/lib/geo/japan-shinkansen/line-catalog";

const root = process.cwd();
const raw = readFileSync(join(root, "public/geo/japan_shinkansen.geojson"), "utf8");
const geo = JSON.parse(raw) as {
  type: string;
  features: Array<{
    properties?: { lineId?: string; color?: string };
    geometry?: { type: string; coordinates: number[][] };
  }>;
};

assert.equal(geo.type, "FeatureCollection");
const ids = new Set(
  geo.features.map((f) => f.properties?.lineId).filter(Boolean),
);
for (const id of JAPAN_SHINKANSEN_LINE_IDS) {
  assert.ok(ids.has(id), `missing geometry for ${id}`);
}

const tokaido = geo.features.find((f) => f.properties?.lineId === "tokaido")!;
assert.equal(tokaido.geometry?.type, "LineString");
assert.ok((tokaido.geometry?.coordinates.length ?? 0) >= 4);

const sync = readFileSync(
  join(root, "lib/context-workspace/map/sync-japan-shinkansen-lines.ts"),
  "utf8",
);
assert.ok(sync.includes("syncJapanShinkansenLineLabels"));
assert.ok(sync.includes("rimvio-japan-shinkansen"));

console.log("ok — japan shinkansen geojson");
