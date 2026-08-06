/**
 * Smoke: Compare Relationship Edge Layer — Object → Relationship → Decision.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildCompareRelationshipEdges,
  shortenRelationshipLabel,
} from "@/lib/context-workspace/projection/build-compare-relationship-edges";
import type { ContextWorkspaceState } from "@/lib/context-workspace/types";
import { CONTEXT_WORKSPACE_VERSION } from "@/lib/context-workspace/types";

const root = process.cwd();
const layerSrc = readFileSync(
  join(root, "components/context-workspace/compare-relationship-edge-layer.tsx"),
  "utf8",
);
const overlaySrc = readFileSync(
  join(root, "components/context-workspace/workspace-map-compare-overlay.tsx"),
  "utf8",
);
const mapSrc = readFileSync(
  join(root, "components/context-workspace/workspace-map-view.tsx"),
  "utf8",
);

assert.ok(layerSrc.includes("data-compare-relationship-edge-layer"));
assert.ok(layerSrc.includes("data-edge-label"));
assert.ok(overlaySrc.includes("CompareRelationshipEdgeLayer"));
assert.ok(mapSrc.includes("resolvedCompareEdges") || mapSrc.includes("compareRelationshipEdges"));
// No new map projection math in edge layer
assert.equal(/map\.project|lngLatTo|haversine|fitBounds/.test(layerSrc), false);

assert.equal(shortenRelationshipLabel("도보 12분"), "12분");
assert.equal(shortenRelationshipLabel("비교"), "비교");

const state = {
  version: CONTEXT_WORKSPACE_VERSION,
  workspaceId: "ws",
  contextEventId: "ctx_rel",
  domain: "lodging",
  status: "editing",
  query: "osaka",
  summaryKo: "Osaka Trip",
  nodes: [],
  relationshipEdges: [
    {
      id: "rel:route:hotelA:usj",
      kind: "route" as const,
      fromId: "hotelA",
      toId: "usj",
      labelKo: "도보 12분",
      meters: 900,
    },
    {
      id: "rel:compare:hotelA:hotelB",
      kind: "compare" as const,
      fromId: "hotelA",
      toId: "hotelB",
      labelKo: "비교",
      meters: null,
    },
    {
      id: "rel:nearby:other:x",
      kind: "nearby" as const,
      fromId: "other",
      toId: "x",
      labelKo: "근처",
      meters: 100,
    },
  ],
  compareIds: ["hotelA", "hotelB"],
  selectedIds: [],
} as Pick<
  ContextWorkspaceState,
  "relationshipEdges" | "compareIds" | "nodes"
>;

const edges = buildCompareRelationshipEdges(state);
assert.ok(edges.some((e) => e.from === "hotelA" && e.to === "usj" && e.type === "route"));
assert.ok(edges.some((e) => e.label === "12분"));
assert.ok(edges.some((e) => e.type === "compare"));
assert.equal(
  edges.some((e) => e.from === "other"),
  false,
  "Default unrelated edges stay out of Compare layer",
);

// Empty compareIds → no edges (Default Map hidden)
assert.deepEqual(
  buildCompareRelationshipEdges({ ...state, compareIds: [] }),
  [],
);

console.log("ok compare-relationship-edge-layer", {
  sample: edges.find((e) => e.type === "route"),
});
