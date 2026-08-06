#!/usr/bin/env npx tsx
/**
 * Korea rail — 2D Workspace Projection; Ingress = absorb.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const mapView = readFileSync(
  join(root, "components/context-workspace/workspace-map-view.tsx"),
  "utf8",
);
const mobile = readFileSync(
  join(root, "components/mobile-workspace/MobileWorkspace.tsx"),
  "utf8",
);
const dock = readFileSync(
  join(root, "components/context-workspace/workspace-cursor-dock.tsx"),
  "utf8",
);
const agent = readFileSync(
  join(root, "lib/context-run/apply-globe-workspace-agent-turn.ts"),
  "utf8",
);
const lodging = readFileSync(
  join(root, "lib/context-workspace/try-apply-workspace-lodging-turn.ts"),
  "utf8",
);
const globeCanvas = readFileSync(
  join(root, "components/experience/rimvio-globe-3d.tsx"),
  "utf8",
);

assert.ok(mapView.includes("syncKoreaRailLines"));
assert.ok(mapView.includes("koreaRailVisibleLineIds"));
assert.ok(mobile.includes("tryApplyRealityAbsorbFromUtterance"));
assert.ok(mobile.includes("koreaRailVisibleLineIds"));
assert.ok(!mobile.includes("resolveKoreaRailOverlayCommand"));
assert.ok(dock.includes("tryApplyRealityAbsorbFromUtterance"));
assert.ok(!dock.includes("resolveKoreaRailOverlayCommand"));
assert.ok(agent.includes("tryApplyRealityAbsorbFromUtterance"));
assert.ok(!agent.includes("tryApplyKoreaRailOverlayFromUtterance"));
assert.ok(lodging.includes("tryApplyRealityAbsorbFromUtterance"));
assert.ok(!lodging.includes("tryApplyKoreaRailOverlayFromUtterance"));
assert.ok(!globeCanvas.includes("syncKoreaRailLines"));

console.log("korea-rail-wire: ok");
