/**
 * Smoke: Compare Decision render path — sheet unmounted; Projection → Decision Callout.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildDecisionProjectionsForCompare,
  enterCompareDecisionProjection,
  clearWorkspaceProjectionForTests,
} from "@/lib/context-workspace/projection";
import type {
  ContextWorkspaceNode,
  ContextWorkspaceState,
} from "@/lib/context-workspace/types";
import { CONTEXT_WORKSPACE_VERSION } from "@/lib/context-workspace/types";

const root = process.cwd();
const shellSrc = readFileSync(
  join(root, "components/context-workspace/context-workspace-shell.tsx"),
  "utf8",
);
const sheetSrc = readFileSync(
  join(root, "components/context-workspace/workspace-compare-sheet.tsx"),
  "utf8",
);
const mapSrc = readFileSync(
  join(root, "components/context-workspace/workspace-map-view.tsx"),
  "utf8",
);
const layerSrc = readFileSync(
  join(root, "components/context-workspace/workspace-map-compare-overlay.tsx"),
  "utf8",
);

assert.equal(
  /import\s+\{\s*WorkspaceCompareSheet\s*\}/.test(shellSrc),
  false,
  "shell must not import WorkspaceCompareSheet",
);
assert.equal(
  /<WorkspaceCompareSheet[\s>]/.test(shellSrc),
  false,
  "shell must not mount WorkspaceCompareSheet",
);
assert.ok(
  shellSrc.includes("decisionProjections="),
  "shell passes decisionProjections to map",
);
assert.ok(
  shellSrc.includes("data-workspace-compare-decision-pill") ||
    shellSrc.includes("workspaceCompareDecisionPill"),
  "shell has compare decision exit pill",
);
assert.ok(
  shellSrc.includes("!compareDecisionActive") &&
    shellSrc.includes("listOpen && !compareDecisionActive"),
  "Discovery list suppressed during compare",
);
assert.ok(mapSrc.includes("WorkspaceMapCompareOverlay"));
assert.ok(layerSrc.includes("data-workspace-map-compare-overlay"));
assert.ok(sheetSrc.includes("@deprecated"));
assert.ok(
  sheetSrc.includes("Always returns null") || sheetSrc.includes("return null"),
);

function node(
  partial: Partial<ContextWorkspaceNode> &
    Pick<ContextWorkspaceNode, "id" | "kind" | "title" | "lat" | "lng">,
): ContextWorkspaceNode {
  return {
    placeId: partial.id,
    summaryKo: "",
    rating: null,
    priceBand: null,
    amountLabel: null,
    thumbnailUrl: null,
    tags: [],
    visible: true,
    selected: false,
    bookmarked: false,
    source: "test",
    ...partial,
  };
}

clearWorkspaceProjectionForTests();

const state = {
  version: CONTEXT_WORKSPACE_VERSION,
  workspaceId: "ws",
  contextEventId: "ctx_step3",
  domain: "lodging",
  status: "editing",
  query: "osaka",
  summaryKo: "Osaka Trip",
  nodes: [
    node({ id: "a", kind: "lodging", title: "A", lat: 34.66, lng: 135.43 }),
    node({ id: "b", kind: "lodging", title: "B", lat: 34.67, lng: 135.44 }),
  ],
  relationshipEdges: [],
  compilerIr: null,
  filter: {},
  selectedIds: [],
  compareIds: ["a", "b"],
  surfacePrimary: "rich_card",
  openedAtIso: new Date().toISOString(),
  updatedAtIso: new Date().toISOString(),
  committedAtIso: null,
  lastChangeKo: null,
  lastWhy: null,
  history: [],
  future: [],
} satisfies ContextWorkspaceState;

const entered = enterCompareDecisionProjection({
  contextEventId: "ctx_step3",
  workspace: state,
});
assert.equal(entered?.mode, "compare_decision");

const decisions = buildDecisionProjectionsForCompare(state);
assert.ok(decisions.length >= 2);
assert.ok(decisions.every((d) => d.mode === "compare_decision"));

console.log("ok compare-decision-render-path sheet→floating-callout");
