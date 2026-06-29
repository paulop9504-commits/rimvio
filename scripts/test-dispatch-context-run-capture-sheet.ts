#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { bindSituation } from "../lib/context-run/bind-situation";
import { planContextRun } from "../lib/context-run/plan-context-run";
import type { ContextRunIngress } from "../lib/context-run/ingress-types";

const root = join(import.meta.dirname, "..");

function planFor(
  text: string,
  surface: "composer" | "capture_sheet",
  layerMode: "personal" | "discovery" = "personal",
) {
  const ingress: ContextRunIngress = {
    kind: "text",
    text,
    surface,
    layerMode,
    contextEventId: null,
  };
  return planContextRun(bindSituation(ingress));
}

const capturePersonal = planFor("서울 출장", "capture_sheet", "personal");
assert.equal(capturePersonal.kind, "experience_run");

const captureDiscovery = planFor("근처 거래", "capture_sheet", "discovery");
assert.equal(captureDiscovery.kind, "external_context_ask");

const composerMarket = planFor("아이폰 팔고 싶어", "composer", "personal");
assert.equal(composerMarket.kind, "portal_compose_run");

const captureMarket = planFor("맥북 구해요", "capture_sheet", "personal");
assert.equal(captureMarket.kind, "portal_compose_run");

const captureSheet = readFileSync(
  join(root, "components/globe/capture-sheet.tsx"),
  "utf8",
);
assert.ok(
  captureSheet.includes("dispatchContextRun"),
  "capture sheet must use dispatchContextRun",
);
assert.ok(
  !captureSheet.includes("resolveExperienceRunTurn"),
  "capture sheet must not call experience run directly",
);
assert.ok(
  !captureSheet.includes("resolvePersonalContextAsk"),
  "capture sheet must not call personal ask directly",
);

const dispatchRun = readFileSync(
  join(root, "lib/context-run/dispatch-context-run.ts"),
  "utf8",
);
assert.ok(
  dispatchRun.includes("syncExperienceRunSummaryToFeed"),
  "dispatchContextRun must sync experience run to feed",
);
assert.ok(
  captureSheet.includes("onPortalComposeClarify"),
  "capture sheet must handle portal compose clarify",
);
assert.ok(
  dispatchRun.includes("portal_compose_run"),
  "dispatchContextRun must execute portal compose run",
);

console.log("test-dispatch-context-run-capture-sheet: ok");
