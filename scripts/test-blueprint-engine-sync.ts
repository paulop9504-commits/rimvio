/**
 * Blueprint executionGraph ↔ installed engines sync.
 */

import assert from "node:assert/strict";
import { composeTravelTripBlueprint } from "../lib/context-blueprint/examples/travel-trip-execution-graph";
import {
  deriveEngineIdsFromExecutionGraph,
  detectRimvioEnginesForMessage,
  readContextInstalledEngineIds,
  syncInstalledEnginesFromBlueprintMetadata,
} from "../lib/engine";
import type { EventCandidate } from "../lib/events/event-candidate";

const blueprint = composeTravelTripBlueprint({
  contextId: "ctx-osaka",
  goal: "오사카 여행",
});

const graphIds = deriveEngineIdsFromExecutionGraph(blueprint.executionGraph);
assert.ok(graphIds.includes("lodging_search"));
assert.ok(graphIds.includes("flight_booking"));
assert.ok(graphIds.includes("finance_prep"));
assert.ok(graphIds.includes("transit_navigate"));
assert.ok(graphIds.includes("trip_experience_search"));

const travelEvent = {
  id: "ctx-osaka",
  title: "오사카",
  category: "travel",
  source: "user",
  lifecycle: "active",
  datetime: "2026-07-16T00:00:00.000Z",
  confidence: 1,
  lifecycleUpdatedAt: "2026-07-01T00:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  metadata: {},
} as unknown as EventCandidate;

const sync = syncInstalledEnginesFromBlueprintMetadata({
  metadata: {},
  blueprint,
  event: travelEvent,
});
assert.equal(sync.changed, true);
assert.ok(sync.engineIds.includes("lodging_search"));
assert.equal(sync.metadata.contextContainerKind, "travel");

const restrictedGraph = {
  ...blueprint,
  executionGraph: blueprint.executionGraph
    ? {
        ...blueprint.executionGraph,
        nodes: blueprint.executionGraph.nodes.filter((node) => node.id !== "stay"),
      }
    : null,
};

const resync = syncInstalledEnginesFromBlueprintMetadata({
  metadata: sync.metadata,
  blueprint: restrictedGraph,
  event: travelEvent,
});
assert.equal(resync.engineIds.includes("lodging_search"), false);
assert.ok(resync.engineIds.includes("flight_booking"));

const syncedEvent = {
  ...travelEvent,
  metadata: resync.metadata,
} as EventCandidate;

assert.deepEqual(
  readContextInstalledEngineIds({ event: syncedEvent, blueprint: restrictedGraph }).sort(),
  [...resync.engineIds].sort(),
);

const lodgingMsg = "부산 숙소 예약 준비해";
assert.deepEqual(
  detectRimvioEnginesForMessage(lodgingMsg, {
    event: syncedEvent,
    blueprint: restrictedGraph,
  }).map((row) => row.id),
  [],
);

assert.deepEqual(
  detectRimvioEnginesForMessage("제주 항공권 예약 준비해", {
    event: syncedEvent,
    blueprint: restrictedGraph,
  }).map((row) => row.id),
  ["flight_booking"],
);

console.log("test-blueprint-engine-sync: ok");
