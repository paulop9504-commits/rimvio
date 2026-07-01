#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");

const openRequest = readFileSync(
  join(root, "lib/nav/open-field-sheet-request.ts"),
  "utf8",
);
assert.ok(
  !openRequest.includes("publishFieldSheetOpen(true)"),
  "field sheet open signal must follow actual open state",
);

const dashboard = readFileSync(
  join(root, "components/field/opportunity-dashboard-sheet.tsx"),
  "utf8",
);
assert.ok(
  dashboard.includes("useRimvioSheetDismissGuard"),
  "dashboard backdrop must guard against nav tap bleed-through",
);
assert.ok(
  dashboard.includes("onClick={dismissSheet}"),
  "dashboard backdrop must use guarded dismiss",
);

const appNav = readFileSync(join(root, "components/app-nav.tsx"), "utf8");
assert.ok(
  !appNav.includes("fieldSheetSignalOpen"),
  "field tab toggle must use provider open state only",
);

console.log("test-field-dashboard-ingress: ok");
