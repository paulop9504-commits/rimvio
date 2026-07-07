import assert from "node:assert/strict";
import { filterPinClustersForLayerPolicy } from "../lib/globe/spatial-semantic/filter-pin-clusters-for-layer-policy";
import {
  publishContextOnlyGlobeProjection,
  publishFoldedGlobeProjection,
  publishFocusGlobeProjection,
  publishGlobeProjectionLayerPolicy,
  readGlobeProjectionLayerPolicy,
  resetGlobeProjectionLayerPolicy,
} from "../lib/globe/spatial-semantic/globe-projection-layer-policy";
import {
  filterContextConditionMarkersByPlaceIds,
  shouldProjectContextConditionMarkers,
  shouldShowContextConditionDiscoveryOverlay,
} from "../lib/globe/spatial-semantic/resolve-context-condition-marker-visibility";
import type { PinCluster } from "../lib/globe/pin-cluster-types";

function cluster(eventId: string, title: string): PinCluster {
  return {
    pinId: `pcluster:${eventId}`,
    eventId,
    title,
    placeLabel: title,
    lat: 34.7,
    lng: 135.5,
    dateLabel: null,
    startedAtIso: null,
    evidence: {
      photoCount: 0,
      videoCount: 0,
      chatCount: 0,
      placePinCount: 1,
    },
    recallLine: null,
  };
}

resetGlobeProjectionLayerPolicy();

const contextId = "trip-osaka";
const childA = cluster(
  `${contextId}:ctxcond:batch-1:eatery:place-a`,
  "Pizza A",
);
const childB = cluster(
  `${contextId}:ctxcond:batch-1:eatery:place-b`,
  "Sushi B",
);
const parent = cluster(contextId, "오사카 여행");
const other = cluster("trip-tokyo", "도쿄");

const all = [parent, childA, childB, other];

assert.deepEqual(
  filterPinClustersForLayerPolicy(all, readGlobeProjectionLayerPolicy()).map(
    (row) => row.eventId,
  ),
  [contextId, "trip-tokyo"],
  "overview hides ctxcond child clusters",
);

publishContextOnlyGlobeProjection(contextId);
assert.deepEqual(
  filterPinClustersForLayerPolicy(all, readGlobeProjectionLayerPolicy()).map(
    (row) => row.eventId,
  ),
  [contextId],
  "context_only keeps parent anchor only",
);

publishFoldedGlobeProjection(contextId);
assert.equal(readGlobeProjectionLayerPolicy().mode, "folded");

publishFocusGlobeProjection({
  contextEventId: contextId,
  visiblePlaceIds: ["place-a"],
});
assert.deepEqual(
  filterPinClustersForLayerPolicy(all, readGlobeProjectionLayerPolicy()).map(
    (row) => row.eventId,
  ),
  [contextId, childA.eventId],
  "focus reveals selected scout children",
);

const markers = [
  { id: "ctxcond:eatery:batch-1:place-a", label: "A" },
  { id: "ctxcond:eatery:batch-1:place-b", label: "B" },
];

assert.equal(
  shouldProjectContextConditionMarkers(readGlobeProjectionLayerPolicy(), contextId),
  true,
);
assert.deepEqual(
  filterContextConditionMarkersByPlaceIds(
    markers,
    readGlobeProjectionLayerPolicy(),
  ).map((row) => row.id),
  ["ctxcond:eatery:batch-1:place-a"],
);

publishFoldedGlobeProjection(contextId);
assert.equal(
  shouldProjectContextConditionMarkers(readGlobeProjectionLayerPolicy(), contextId),
  false,
);
assert.equal(
  shouldShowContextConditionDiscoveryOverlay(
    readGlobeProjectionLayerPolicy(),
    contextId,
  ),
  false,
);

publishFocusGlobeProjection({
  contextEventId: contextId,
  visiblePlaceIds: ["place-a"],
});
assert.equal(
  shouldShowContextConditionDiscoveryOverlay(
    readGlobeProjectionLayerPolicy(),
    contextId,
  ),
  false,
  "discovery radius ring disabled for sparse map",
);

publishGlobeProjectionLayerPolicy({ mode: "overview", activeContextEventId: null });
assert.equal(readGlobeProjectionLayerPolicy().mode, "overview");

console.log("test-globe-projection-layer-policy: ok");
