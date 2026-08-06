#!/usr/bin/env npx tsx
/**
 * Japan metro — Projection wire; Ingress = Reality absorb (ADR-051).
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
const globe = readFileSync(
  join(root, "components/experience/rimvio-globe-3d.tsx"),
  "utf8",
);

assert.ok(mapView.includes("syncJapanMetroLines"));
assert.ok(mapView.includes("japanMetroVisibleLineIds"));
assert.ok(mobile.includes("tryApplyRealityAbsorbFromUtterance"));
assert.ok(!mobile.includes("resolveJapanMetroOverlayCommand"));
assert.ok(dock.includes("tryApplyRealityAbsorbFromUtterance"));
assert.ok(!dock.includes("resolveJapanMetroOverlayCommand"));
assert.ok(agent.includes("tryApplyRealityAbsorbFromUtterance"));
assert.ok(!agent.includes("tryApplyJapanMetroOverlayFromUtterance"));
assert.ok(lodging.includes("tryApplyRealityAbsorbFromUtterance"));
assert.ok(!lodging.includes("tryApplyJapanMetroOverlayFromUtterance"));
assert.ok(!globe.includes("syncJapanMetroLines"));

console.log("japan-metro-wire: ok");
