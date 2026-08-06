#!/usr/bin/env npx tsx
/**
 * Desktop Workspace: RimvioBottomSheet place peek + Why-on-map (no spoke fragments).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const carousel = readFileSync(
  join(root, "components/context-workspace/workspace-object-carousel.tsx"),
  "utf8",
);
const shell = readFileSync(
  join(root, "components/context-workspace/context-workspace-shell.tsx"),
  "utf8",
);

assert.ok(
  carousel.includes('from "@/components/ui/rimvio-bottom-sheet"'),
  "carousel must use RimvioBottomSheet",
);
assert.ok(
  carousel.includes('variant="placeMid"'),
  "carousel sheet variant placeMid",
);
assert.ok(
  !carousel.includes("useDragControls"),
  "carousel must not keep hand-rolled framer sheet drag",
);
assert.ok(
  shell.includes("desktopObjectDecisionSpokes"),
  "shell builds desktop Why overlay payload",
);
assert.ok(
  shell.includes("objectDecisionSpokes={null}"),
  "shell must not paint spoke fragment cards on map",
);
assert.ok(
  shell.includes("spatialDecisionOverlay={desktopObjectDecisionSpokes?.overlay"),
  "shell passes spatial overlay",
);
assert.ok(
  shell.includes("onSpokeFacetSelect={setDesktopSpokeFacetId}"),
  "shell syncs spoke facet selection",
);
assert.ok(
  !shell.includes("buildObjectDecisionSpokes"),
  "shell must not build map spokes",
);

console.log("ok — desktop Rimvio sheet + Why highlight (no spokes)");
