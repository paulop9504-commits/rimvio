#!/usr/bin/env npx tsx
/**
 * One-touch Workspace open — Capsule → expand without preview sheet.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { clearContextWorkspace } from "@/lib/context-workspace/workspace-store";
import { openMapContextWorkspace } from "@/lib/context-workspace/open-map-workspace";
import {
  openWorkspaceOneTouch,
  shouldOfferWorkspaceOneTouchChip,
} from "@/lib/context-workspace/open-workspace-one-touch";
import { readContextWorkspaceExpanded } from "@/lib/context-workspace/workspace-store";

const CTX = "ctx_one_touch_workspace";
clearContextWorkspace(CTX);

openMapContextWorkspace({
  contextEventId: CTX,
  domain: "poi",
  query: "오사카 벚꽃",
  summaryKo: "오사카 벚꽃 탐색",
  candidates: [],
});

assert.equal(shouldOfferWorkspaceOneTouchChip(CTX), true);
assert.equal(readContextWorkspaceExpanded(CTX), false);

const opened = openWorkspaceOneTouch({
  contextEventId: CTX,
  utterance: "오사카 벚꽃",
});
assert.ok(opened.ok);
assert.equal(opened.contextEventId, CTX);
assert.equal(readContextWorkspaceExpanded(CTX), true);
assert.equal(shouldOfferWorkspaceOneTouchChip(CTX), false);

const node = readFileSync(
  join(process.cwd(), "components/globe/ContextNode.tsx"),
  "utf8",
);
assert.ok(node.includes("openWorkspaceOneTouch"));
assert.ok(node.includes("data-one-touch-workspace"));
assert.ok(!node.includes("Context Preview"));

const home = readFileSync(
  join(process.cwd(), "components/globe/globe-home-client.tsx"),
  "utf8",
);
assert.ok(home.includes("GlobeWorkspaceOneTouchChip"));

clearContextWorkspace(CTX);
console.log("ok — workspace one-touch open");
