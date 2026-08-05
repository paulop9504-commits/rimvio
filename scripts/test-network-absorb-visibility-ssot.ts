#!/usr/bin/env npx tsx
/**
 * Absorb visibility fold — Materialized Projection SSOT (ADR-051 D/E).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  foldAbsorbNetworkVisibility,
  getFamilyVisibleLineIds,
} from "@/lib/reality-provider/network-absorb-projection";

let state = foldAbsorbNetworkVisibility(null, {
  family: "osaka_metro",
  op: "replace",
  lineIds: ["midosuji", "tanimachi"],
  labelKo: "오사카 메트로",
  providerId: "cached_overlay",
  needId: "metro_network",
});
assert.deepEqual(getFamilyVisibleLineIds(state, "osaka_metro"), [
  "midosuji",
  "tanimachi",
]);

state = foldAbsorbNetworkVisibility(state, {
  family: "osaka_metro",
  op: "add",
  lineIds: ["yotsubashi"],
  labelKo: "요쓰바시선",
  providerId: "cached_overlay",
  needId: "metro_network",
});
assert.ok(getFamilyVisibleLineIds(state, "osaka_metro").includes("yotsubashi"));
assert.equal(getFamilyVisibleLineIds(state, "osaka_metro").length, 3);

state = foldAbsorbNetworkVisibility(state, {
  family: "osaka_metro",
  op: "remove",
  lineIds: ["midosuji"],
  labelKo: "미도스지선",
  providerId: "cached_overlay",
  needId: "metro_network",
});
assert.ok(!getFamilyVisibleLineIds(state, "osaka_metro").includes("midosuji"));

state = foldAbsorbNetworkVisibility(state, {
  family: "osaka_metro",
  op: "clear",
  lineIds: [],
  labelKo: "오사카 메트로",
  providerId: "cached_overlay",
  needId: "metro_network",
});
assert.equal(getFamilyVisibleLineIds(state, "osaka_metro").length, 0);

const mobile = readFileSync(
  join(process.cwd(), "components/mobile-workspace/MobileWorkspace.tsx"),
  "utf8",
);
const shell = readFileSync(
  join(process.cwd(), "components/context-workspace/context-workspace-shell.tsx"),
  "utf8",
);
assert.ok(mobile.includes("useOsakaMetroAbsorbLineIds"));
assert.ok(!mobile.includes("useOsakaMetroVisibleLineIds"));
assert.ok(shell.includes("useOsakaMetroAbsorbLineIds"));
assert.ok(!shell.includes("useOsakaMetroVisibleLineIds"));

console.log("ok — network-absorb-visibility-ssot");
