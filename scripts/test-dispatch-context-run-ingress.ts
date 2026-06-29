#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { bindSituation } from "../lib/context-run/bind-situation";
import { planContextRun } from "../lib/context-run/plan-context-run";
import type { ContextRunIngress } from "../lib/context-run/ingress-types";

const root = join(import.meta.dirname, "..");

function planPhoto(layerMode: "personal" | "discovery", mode: "direct" | "walkthrough") {
  const ingress: ContextRunIngress = {
    kind: "photo",
    files: [{ name: "test.jpg" } as File],
    surface: "composer",
    layerMode,
    mode,
  };
  return planContextRun(bindSituation(ingress));
}

assert.equal(planPhoto("personal", "direct").kind, "photo_ingest");
assert.equal(planPhoto("personal", "walkthrough").kind, "photo_walkthrough");
assert.equal(planPhoto("discovery", "direct").kind, "discovery_photo_hint");

const shareIngress: ContextRunIngress = {
  kind: "share",
  text: "https://example.com",
  shareKind: "url",
  surface: "capture_sheet",
  layerMode: "personal",
};
assert.equal(planContextRun(bindSituation(shareIngress)).kind, "share_ingest");

const gpsIngress: ContextRunIngress = {
  kind: "gps_dwell_confirm",
  eventId: "evt-gps-1",
  surface: "globe_inbox",
};
assert.equal(planContextRun(bindSituation(gpsIngress)).kind, "gps_dwell_confirm_open");

const home = readFileSync(
  join(root, "components/globe/globe-home-client.tsx"),
  "utf8",
);
assert.ok(
  home.includes("commitTextContextIngress"),
  "globe home must commit text via context-run adapter",
);
assert.ok(
  !home.includes("ingestGlobeContextFromText"),
  "globe home must not ingest text directly",
);

const inbox = readFileSync(
  join(root, "components/globe/globe-inbox-sheet.tsx"),
  "utf8",
);
assert.ok(
  inbox.includes("gps_dwell_confirm"),
  "inbox gps dwell must use dispatchContextRun",
);

console.log("test-dispatch-context-run-ingress: ok");
