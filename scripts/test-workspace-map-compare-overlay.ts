/**
 * Smoke: WorkspaceMapCompareOverlay — decisions + pin-engine anchors only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildDecisionProjectionsForCompare,
} from "@/lib/context-workspace/projection";
import type {
  ContextWorkspaceNode,
  ContextWorkspaceState,
} from "@/lib/context-workspace/types";
import { CONTEXT_WORKSPACE_VERSION } from "@/lib/context-workspace/types";

const root = process.cwd();
const overlaySrc = readFileSync(
  join(root, "components/context-workspace/workspace-map-compare-overlay.tsx"),
  "utf8",
);
const mapSrc = readFileSync(
  join(root, "components/context-workspace/workspace-map-view.tsx"),
  "utf8",
);

assert.ok(overlaySrc.includes("WorkspaceMapCompareOverlayProps"));
assert.ok(overlaySrc.includes("data-workspace-map-compare-overlay"));
assert.ok(overlaySrc.includes("DecisionCallout"));
// Must not invent map projection math
assert.equal(/map\.project|lngLatTo|haversine|fitBounds/.test(overlaySrc), false);
assert.ok(mapSrc.includes("WorkspaceMapCompareOverlay"));
assert.ok(mapSrc.includes("anchors={anchorsByEntityId}"));

const calloutSrc = readFileSync(
  join(root, "components/context-workspace/decision-callout.tsx"),
  "utf8",
);
assert.ok(calloutSrc.includes("data-decision-callout"));
assert.ok(calloutSrc.includes("judgmentKo"));
assert.ok(calloutSrc.includes("imageUrl"));

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
    thumbnailUrl: partial.thumbnailUrl ?? null,
    tags: [],
    visible: true,
    selected: false,
    bookmarked: false,
    source: "test",
    ...partial,
  };
}

const state = {
  version: CONTEXT_WORKSPACE_VERSION,
  workspaceId: "ws",
  contextEventId: "ctx_overlay",
  domain: "lodging",
  status: "editing",
  query: "osaka",
  summaryKo: "Osaka Trip",
  nodes: [
    node({
      id: "a",
      kind: "lodging",
      title: "Hotel A",
      lat: 34.66,
      lng: 135.43,
      thumbnailUrl: "https://example.com/a.jpg",
      amountLabel: "180000원",
    }),
    node({
      id: "b",
      kind: "lodging",
      title: "Hotel B",
      lat: 34.67,
      lng: 135.44,
      thumbnailUrl: "https://example.com/b.jpg",
      amountLabel: "90000원",
    }),
  ],
  relationshipEdges: [
    {
      id: "rel:compare:a:b",
      kind: "compare" as const,
      fromId: "a",
      toId: "b",
      labelKo: "비교",
      meters: null,
    },
  ],
  compilerIr: null,
  filter: {},
  selectedIds: [],
  compareIds: ["a", "b"],
  surfacePrimary: "rich_card" as const,
  openedAtIso: new Date().toISOString(),
  updatedAtIso: new Date().toISOString(),
  committedAtIso: null,
  lastChangeKo: null,
  lastWhy: null,
  history: [],
  future: [],
} satisfies ContextWorkspaceState;

const decisions = buildDecisionProjectionsForCompare(state);
assert.equal(decisions.length, 2);
assert.ok(decisions.every((d) => typeof d.imageUrl === "string" || d.imageUrl === null));
assert.equal(decisions.find((d) => d.entityId === "a")?.imageUrl, "https://example.com/a.jpg");
assert.ok(decisions.every((d) => d.judgmentKo.length > 0));
assert.ok(decisions.every((d) => d.actions.includes("select")));
// No list-card fields on Decision Callout contract
assert.ok(decisions.every((d) => !("price" in d && typeof (d as { price?: unknown }).price === "string")));
assert.ok(decisions.every((d) => !("ratingLabel" in d)));

console.log("ok workspace-map-compare-overlay DecisionProjection→anchors→callout");
