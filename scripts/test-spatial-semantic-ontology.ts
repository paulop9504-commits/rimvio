import assert from "node:assert/strict";
import {
  buildClarifyingOntologyGraph,
  buildContextDiscoveryOntologyGraph,
} from "../lib/globe/spatial-semantic/build-context-discovery-ontology-graph";
import { rankPlacesByGeoOntologyFacet } from "../lib/globe/spatial-semantic/apply-geo-ontology-facet";

const baseSpec = {
  version: 1 as const,
  resourceTypes: ["restaurant"] as const,
  transport: "walk" as const,
  budget: "medium" as const,
  vibe: "popular" as const,
  lodgingKind: "any" as const,
  radiusM: 800,
  eateryFocus: "수제버거",
};

const clarify = buildClarifyingOntologyGraph({
  contextEventId: "ev-osaka",
  anchorPlaceName: "오사카",
  themeKo: "수제버거",
});
assert.equal(clarify.nodes.length, 2);
assert.equal(clarify.edges.length, 1);

const graph = buildContextDiscoveryOntologyGraph({
  contextEventId: "ev-osaka",
  anchorPlaceName: "오사카",
  outcome: {
    batchId: "batch-1",
    lodgingCount: 0,
    eateryCount: 2,
    summaryKo: "ok",
    pinPoints: [],
    radiusM: 800,
    spec: baseSpec,
    recommendations: [
      {
        kind: "eatery",
        title: "Burger A",
        reasonKo: "지금 위치에서 가까워요",
        rank: 1,
        placeId: "p-a",
        lat: 34.1,
        lng: 135.1,
      },
      {
        kind: "eatery",
        title: "Burger B",
        reasonKo: "평점이 높아요",
        rank: 2,
        placeId: "p-b",
        lat: 34.2,
        lng: 135.2,
      },
    ],
  },
});

assert.ok(graph.nodes.some((node) => node.kind === "facet"));
assert.ok(graph.nodes.some((node) => node.placeId === "p-a"));

const ranked = rankPlacesByGeoOntologyFacet({
  facetId: "distance",
  recommendations: graph.nodes
    .filter((node) => node.kind === "place")
    .map((node, index) => ({
      kind: "eatery" as const,
      title: node.labelKo,
      reasonKo: index === 0 ? "가까워요" : "멀어요",
      rank: index + 1,
      placeId: node.placeId!,
      lat: 0,
      lng: 0,
    })),
});
assert.equal(ranked[0], "p-a");

console.log("test-spatial-semantic-ontology: ok");
