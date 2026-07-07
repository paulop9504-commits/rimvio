import assert from "node:assert/strict";
import {
  parsePalantirFacetFromMessage,
  resolvePalantirExcludePlaceIds,
  resolvePalantirRefineIntent,
} from "../lib/globe/spatial-semantic/resolve-palantir-refine-intent";
import { applyPalantirOperatorFacetRefine } from "../lib/globe/spatial-semantic/palantir-workspace-operator";
import { readGlobeProjectionLayerPolicy } from "../lib/globe/spatial-semantic/globe-projection-layer-policy";
import type { ContextConditionRecommendation } from "../lib/globe/context-condition-ai/local-discovery-action-types";

const spec = {
  version: 1 as const,
  resourceTypes: ["restaurant"] as const,
  transport: "walk" as const,
  budget: "medium" as const,
  vibe: "popular" as const,
  lodgingKind: "any" as const,
  radiusM: 500,
};

function rec(rank: number, placeId: string, reasonKo: string): ContextConditionRecommendation {
  return {
    kind: "eatery",
    title: `Place ${rank}`,
    reasonKo,
    rank,
    placeId,
    lat: 34.7,
    lng: 135.5,
  };
}

const recommendations = [
  rec(1, "p1", "가까운 곳"),
  rec(2, "p2", "저렴한 곳"),
  rec(3, "p3", "조용한 곳"),
];

assert.equal(parsePalantirFacetFromMessage("더 가까운 곳"), "distance");
assert.equal(parsePalantirFacetFromMessage("조금 더 싸게"), "price");

const alternate = resolvePalantirRefineIntent({
  message: "다른 곳 보여줘",
  currentSpec: spec,
  previousRecommendations: recommendations,
});
assert.equal(alternate?.kind, "alternate_scout");

const facet = resolvePalantirRefineIntent({
  message: "더 가까운 곳",
  currentSpec: spec,
  previousRecommendations: recommendations,
});
assert.equal(facet?.kind, "facet_rerank");
if (facet?.kind === "facet_rerank") {
  assert.equal(facet.facetId, "distance");
}

assert.deepEqual(
  resolvePalantirExcludePlaceIds({
    recommendations,
    projectedPlaceIds: ["p1"],
  }).sort(),
  ["p1", "p2", "p3"],
);

const snapshot = applyPalantirOperatorFacetRefine({
  contextEventId: "ctx-1",
  facetId: "price",
  recommendations,
  spec,
  radiusM: 500,
});
assert.ok(snapshot);
assert.equal(readGlobeProjectionLayerPolicy().mode, "focus");
assert.ok(snapshot!.briefKo.includes("Place 2"));

console.log("test-palantir-refine-intent: ok");
