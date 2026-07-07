import assert from "node:assert/strict";
import { buildContextDiscoveryOntologyGraph } from "../lib/globe/spatial-semantic/build-context-discovery-ontology-graph";
import {
  applyPalantirOperatorAfterScout,
} from "../lib/globe/spatial-semantic/palantir-workspace-operator";
import { publishGeoOntologyGraph } from "../lib/globe/spatial-semantic/geo-ontology-graph-store";
import { readGlobeProjectionLayerPolicy } from "../lib/globe/spatial-semantic/globe-projection-layer-policy";
import {
  hasPalantirOntologyHistory,
  readPalantirOntologyHistory,
  restorePalantirOntologyHead,
} from "../lib/globe/spatial-semantic/palantir-ontology-history-store";
import { readPalantirWorkspaceSnapshot } from "../lib/globe/spatial-semantic/palantir-workspace-store";
import { clearPalantirWorkspaceSnapshot } from "../lib/globe/spatial-semantic/palantir-workspace-store";

const contextA = "ctx-osaka";
const contextB = "ctx-tokyo";

const recommendations = [
  {
    kind: "eatery" as const,
    title: "피자 A",
    reasonKo: "가까워요",
    rank: 1,
    placeId: "pizza-a",
    lat: 34.7,
    lng: 135.5,
  },
  {
    kind: "eatery" as const,
    title: "피자 B",
    reasonKo: "저렴해요",
    rank: 2,
    placeId: "pizza-b",
    lat: 34.701,
    lng: 135.501,
  },
];

const spec = {
  version: 1 as const,
  resourceTypes: ["restaurant"] as const,
  transport: "walk" as const,
  budget: "medium" as const,
  vibe: "popular" as const,
  lodgingKind: "any" as const,
  radiusM: 500,
  eateryFocus: "피자",
};

publishGeoOntologyGraph(
  buildContextDiscoveryOntologyGraph({
    contextEventId: contextA,
    anchorPlaceName: "오사카",
    outcome: {
      batchId: "batch-a",
      radiusM: 500,
      spec,
      recommendations,
      lodgingCount: 0,
      eateryCount: 2,
      summaryKo: "ok",
    },
  }),
);

applyPalantirOperatorAfterScout({
  contextEventId: contextA,
  anchorPlaceName: "오사카",
  outcome: {
    batchId: "batch-a",
    radiusM: 500,
    recommendations,
    spec,
  },
});

assert.ok(hasPalantirOntologyHistory(contextA));
assert.equal(readPalantirOntologyHistory(contextA).length, 1);
assert.equal(readPalantirWorkspaceSnapshot(contextA)?.primaryPlaceId, "pizza-a");

clearPalantirWorkspaceSnapshot(contextA);
assert.equal(readPalantirWorkspaceSnapshot(contextA), null);

const restored = restorePalantirOntologyHead(contextA);
assert.ok(restored);
assert.equal(readPalantirWorkspaceSnapshot(contextA)?.primaryPlaceId, "pizza-a");
assert.equal(readGlobeProjectionLayerPolicy().mode, "focus");
assert.equal(readGlobeProjectionLayerPolicy().visiblePlaceIds.length, 2);

assert.equal(hasPalantirOntologyHistory(contextB), false);
assert.equal(restorePalantirOntologyHead(contextB), null);

console.log("test-palantir-ontology-history: ok");
