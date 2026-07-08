#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  flyGlobeToDiscoveryLenses,
  snapGlobeToContextConditionScout,
} from "../lib/globe/context-agent/snap-globe-to-context-agent-anchor";
import { buildContextDiscoveryOntologyGraph } from "../lib/globe/spatial-semantic/build-context-discovery-ontology-graph";
import { activitySubtypeBadgeLabel } from "../lib/globe/place/activity-subtype-presentation";
import { resolveContextResourceMapMarkers } from "../lib/globe/resolve-context-resource-map-markers";

function createGlobeRef() {
  const calls: Array<{
    kind: "pin" | "bounds" | "flyPin" | "flyBounds";
    payload: Record<string, number>;
  }> = [];
  return {
    calls,
    ref: {
      current: {
        snapToPin(lat: number, lng: number) {
          calls.push({ kind: "pin", payload: { lat, lng } });
        },
        snapToDiscoveryBounds(input: {
          centerLat: number;
          centerLng: number;
          altitude: number;
        }) {
          calls.push({ kind: "bounds", payload: input });
        },
        flyToPin(lat: number, lng: number) {
          calls.push({ kind: "flyPin", payload: { lat, lng } });
        },
        flyToDiscoveryBounds(input: {
          centerLat: number;
          centerLng: number;
          altitude: number;
        }) {
          calls.push({ kind: "flyBounds", payload: input });
        },
      },
    },
  };
}

const single = createGlobeRef();
snapGlobeToContextConditionScout(single.ref as never, {
  anchorLat: 35.6762,
  anchorLng: 139.6503,
  recommendations: [{ lat: 35.6329, lng: 139.8804 }],
  radiusM: 50000,
});
assert.equal(single.calls.length, 1);
assert.equal(single.calls[0]?.kind, "pin");
assert.deepEqual(single.calls[0]?.payload, { lat: 35.6329, lng: 139.8804 });

const multiple = createGlobeRef();
snapGlobeToContextConditionScout(multiple.ref as never, {
  anchorLat: 35.6762,
  anchorLng: 139.6503,
  recommendations: [
    { lat: 35.6329, lng: 139.8804 },
    { lat: 35.7101, lng: 139.8107 },
  ],
  radiusM: 50000,
});
assert.equal(multiple.calls.length, 1);
assert.equal(multiple.calls[0]?.kind, "bounds");

const lensFly = createGlobeRef();
flyGlobeToDiscoveryLenses(lensFly.ref as never, {
  lenses: [
    { center: { lat: 34.6654, lng: 135.4323 }, radiusM: 2500 },
    { center: { lat: 34.668, lng: 135.43 }, radiusM: 2500 },
  ],
});
assert.equal(lensFly.calls.length, 1);
assert.equal(lensFly.calls[0]?.kind, "flyBounds");

const activityMarker = {
  lat: 34.6654,
  lng: 135.4323,
  isMain: true,
  resourceId: "evt:activity:ride1",
  contextConditionPin: true,
  thumbnailUrl: "https://example.com/ride.jpg",
};
const geographic = resolveContextResourceMapMarkers({
  markers: [activityMarker],
  hubLat: 34.7,
  hubLng: 135.5,
  layoutAtHub: false,
});
assert.equal(geographic[0]?.lat, 34.6654);
assert.equal(geographic[0]?.lng, 135.4323);

assert.equal(activitySubtypeBadgeLabel("general"), "놀거리");
assert.equal(activitySubtypeBadgeLabel(null), "놀거리");

const graph = buildContextDiscoveryOntologyGraph({
  contextEventId: "evt-1",
  anchorPlaceName: "오사카",
  outcome: {
    batchId: "b1",
    lodgingCount: 0,
    eateryCount: 1,
    summaryKo: "ok",
    pinPoints: [{ lat: 34.6654, lng: 135.4323 }],
    radiusM: 2500,
    recommendations: [
      {
        kind: "activity",
        title: "쥬라기 공원 더 라이드",
        reasonKo: "놀거리",
        placeId: "p1",
        lat: 34.6654,
        lng: 135.4323,
        rank: 1,
      },
    ],
    spec: {
      version: 1,
      resourceTypes: ["activity"],
      transport: "walk",
      budget: "medium",
      vibe: "popular",
      lodgingKind: "any",
      radiusM: 2500,
      activityFocus: "오사카 유니버설",
      activitySubtype: "general",
    },
  },
});
const root = graph.nodes.find((node) => node.kind === "root");
assert.equal(root?.labelKo, "놀거리");
assert.ok(!graph.nodes.some((node) => node.kind === "root" && node.labelKo === "맛집"));

console.log("test-activity-landmark-map-focus: ok");
