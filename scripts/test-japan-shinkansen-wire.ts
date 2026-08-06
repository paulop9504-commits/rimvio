#!/usr/bin/env npx tsx
/**
 * Japan Shinkansen — 2D Workspace Projection; Ingress = absorb.
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

assert.ok(mapView.includes("syncJapanShinkansenLines"));
assert.ok(mapView.includes("japanShinkansenVisibleLineIds"));
assert.ok(mapView.includes("JapanShinkansenLineLegend"));
assert.ok(mobile.includes("tryApplyRealityAbsorbFromUtterance"));
assert.ok(mobile.includes("japanShinkansenVisibleLineIds"));
assert.ok(!mobile.includes("resolveJapanShinkansenOverlayCommand"));
assert.ok(dock.includes("tryApplyRealityAbsorbFromUtterance"));
assert.ok(!dock.includes("resolveJapanShinkansenOverlayCommand"));
assert.ok(agent.includes("tryApplyRealityAbsorbFromUtterance"));
assert.ok(!agent.includes("tryApplyJapanShinkansenOverlayFromUtterance"));
assert.ok(lodging.includes("tryApplyRealityAbsorbFromUtterance"));
assert.ok(!lodging.includes("tryApplyJapanShinkansenOverlayFromUtterance"));
assert.ok(!globeCanvas.includes("syncJapanShinkansenLines"));

console.log("ok — japan shinkansen 2D workspace wire");
