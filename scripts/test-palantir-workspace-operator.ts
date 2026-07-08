import assert from "node:assert/strict";
import {
  applyPalantirOperatorAfterScout,
  buildPalantirOperatorBrief,
  pickPalantirProjectedRecommendations,
  resolvePalantirProjectionCount,
} from "../lib/globe/spatial-semantic/palantir-workspace-operator";
import { readGlobeProjectionLayerPolicy } from "../lib/globe/spatial-semantic/globe-projection-layer-policy";
import { readPalantirWorkspaceSnapshot } from "../lib/globe/spatial-semantic/palantir-workspace-store";
import type { ContextConditionRecommendation } from "../lib/globe/context-condition-ai/local-discovery-action-types";

function rec(rank: number, placeId: string, title: string): ContextConditionRecommendation {
  return {
    kind: "eatery",
    title,
    reasonKo: `reason-${rank}`,
    rank,
    placeId,
    lat: 34.7 + rank * 0.001,
    lng: 135.5,
  };
}

assert.equal(resolvePalantirProjectionCount(1), 1);
assert.equal(resolvePalantirProjectionCount(3), 2);
assert.equal(resolvePalantirProjectionCount(8), 3);

const many = [1, 2, 3, 4, 5].map((rank) => rec(rank, `p${rank}`, `Place ${rank}`));
assert.equal(pickPalantirProjectedRecommendations(many).length, 3);

const brief = buildPalantirOperatorBrief({
  projected: pickPalantirProjectedRecommendations(many),
  eateryFocus: "피자",
});
assert.ok(brief.includes("Place 1"));
assert.ok(brief.includes("Place 2"));

const contextId = "trip-osaka-palantir";
const snapshot = applyPalantirOperatorAfterScout({
  contextEventId: contextId,
  anchorPlaceName: "오사카",
  outcome: {
    batchId: "batch-1",
    radiusM: 500,
    recommendations: many,
    spec: {
      version: 1,
      resourceTypes: ["restaurant"],
      transport: "walk",
      budget: "medium",
      vibe: "popular",
      lodgingKind: "any",
      radiusM: 500,
      eateryFocus: "피자",
    },
  },
});

assert.ok(snapshot);
assert.equal(snapshot!.primaryPlaceId, "p1");
assert.equal(snapshot!.activeFacetId, "distance");
assert.deepEqual(snapshot!.projectedPlaceIds, ["p1", "p2", "p3"]);
assert.equal(readPalantirWorkspaceSnapshot(contextId)?.batchId, "batch-1");
assert.equal(readGlobeProjectionLayerPolicy().mode, "focus");
assert.equal(readGlobeProjectionLayerPolicy().visiblePlaceIds.length, 3);

console.log("test-palantir-workspace-operator: ok");
