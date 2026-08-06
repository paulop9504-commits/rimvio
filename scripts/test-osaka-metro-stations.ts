#!/usr/bin/env npx tsx
/**
 * Osaka Metro station catalog + sync wiring.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  OSAKA_METRO_STATIONS,
  stationsForVisibleLines,
} from "@/lib/geo/osaka-metro/station-catalog";

assert.ok(OSAKA_METRO_STATIONS.length >= 20);

const hubs = OSAKA_METRO_STATIONS.filter((s) => s.hub);

const esaka = OSAKA_METRO_STATIONS.find((s) => s.id === "midosuji:esaka");
assert.ok(esaka);
assert.ok(esaka!.lng > 135.63 && esaka!.lng < 135.66, "Esaka is east of Shin-Osaka");
assert.ok(esaka!.lat > 34.75 && esaka!.lat < 34.77);

const namba = OSAKA_METRO_STATIONS.find((s) => s.nameKo === "난바" && s.hub);
assert.ok(namba);
assert.ok(namba!.lng > 135.49 && namba!.lng < 135.51);
assert.ok(hubs.some((s) => s.nameKo === "난바"));
assert.ok(hubs.some((s) => s.nameKo === "우메다"));
assert.ok(hubs.some((s) => s.nameKo === "신오사카"));
assert.ok(hubs.some((s) => s.nameKo === "유니버설시티"));

const usjLine = stationsForVisibleLines(["jr_yumesaki"]);
assert.ok(usjLine.some((s) => s.nameKo === "유니버설시티"));
assert.ok(usjLine.some((s) => s.nameKo === "니시쿠조"));

const midosuji = stationsForVisibleLines(["midosuji"]);
assert.ok(midosuji.some((s) => s.nameKo === "난바"));
assert.ok(midosuji.every((s) => s.lineIds.includes("midosuji") || s.lineIds.length > 1));

const hubsOnly = stationsForVisibleLines(["midosuji"], { hubsOnly: true });
assert.ok(hubsOnly.every((s) => s.hub));
assert.ok(hubsOnly.length < midosuji.length);

const sync = readFileSync(
  join(process.cwd(), "lib/context-workspace/map/sync-osaka-metro-lines.ts"),
  "utf8",
);
assert.ok(sync.includes("syncOsakaMetroStationLabels"));

console.log("ok — osaka metro stations");
