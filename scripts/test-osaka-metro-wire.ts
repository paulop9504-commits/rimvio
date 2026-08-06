#!/usr/bin/env npx tsx
/**
 * Osaka Metro — 2D Workspace wire (Projection reads overlay store; Ingress = absorb).
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
const reality = readFileSync(
  join(root, "components/mobile-workspace/RealityMap.tsx"),
  "utf8",
);
const shell = readFileSync(
  join(root, "components/context-workspace/context-workspace-shell.tsx"),
  "utf8",
);

assert.ok(mapView.includes("syncOsakaMetroLines"));
assert.ok(mapView.includes("osakaMetroVisibleLineIds"));
assert.ok(mobile.includes("tryApplyRealityAbsorbFromUtterance"));
assert.ok(mobile.includes("useOsakaMetroAbsorbLineIds"));
assert.ok(!mobile.includes("resolveOsakaMetroOverlayCommand"));
assert.ok(mobile.includes("osakaMetroVisibleLineIds={osakaMetroVisibleLineIds}"));
assert.ok(dock.includes("tryApplyRealityAbsorbFromUtterance"));
assert.ok(!dock.includes("resolveOsakaMetroOverlayCommand"));
assert.ok(reality.includes("osakaMetroVisibleLineIds"));
assert.ok(shell.includes("useOsakaMetroAbsorbLineIds"));
assert.ok(shell.includes("osakaMetroVisibleLineIds={osakaMetroVisibleLineIds}"));

const agent = readFileSync(
  join(root, "lib/context-run/apply-globe-workspace-agent-turn.ts"),
  "utf8",
);
assert.ok(agent.includes("tryApplyRealityAbsorbFromUtterance"));
assert.ok(!agent.includes("tryApplyOsakaMetroOverlayFromUtterance"));
const lodging = readFileSync(
  join(root, "lib/context-workspace/try-apply-workspace-lodging-turn.ts"),
  "utf8",
);
assert.ok(lodging.includes("tryApplyRealityAbsorbFromUtterance"));
assert.ok(!lodging.includes("tryApplyOsakaMetroOverlayFromUtterance"));

const globeCanvas = readFileSync(
  join(root, "lib/globe/apply-rimvio-vector-map-canvas.ts"),
  "utf8",
);
assert.ok(!globeCanvas.includes("osaka_metro"));
assert.ok(!globeCanvas.includes("syncOsakaMetroLines"));

console.log("ok — osaka metro 2D workspace wire");
