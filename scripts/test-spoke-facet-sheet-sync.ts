#!/usr/bin/env npx tsx
/**
 * Spoke ↔ sheet facet sync — Hybrid: spoke tap opens Action Sheet facet.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const mobile = readFileSync(
  join(root, "components/mobile-workspace/MobileWorkspace.tsx"),
  "utf8",
);
const overlay = readFileSync(
  join(root, "components/context-workspace/object-decision-spoke-overlay.tsx"),
  "utf8",
);
const sheet = readFileSync(
  join(root, "components/ui/rimvio-bottom-sheet.tsx"),
  "utf8",
);

assert.ok(mobile.includes("RimvioBottomSheet"));
assert.ok(mobile.includes("ObjectPlacePanel"));
assert.ok(mobile.includes("actionSheetOpen"));
assert.ok(mobile.includes('type: "open_facet"'));
assert.ok(overlay.includes("data-spoke-active"));
assert.ok(overlay.includes("aria-pressed"));
assert.ok(sheet.includes("placeMid"));
assert.ok(sheet.includes("useRimvioSheetDismissGuard"));

console.log("ok — spoke↔facet sync + hybrid Action Sheet wired");
