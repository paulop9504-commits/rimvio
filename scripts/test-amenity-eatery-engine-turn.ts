/**
 * Amenity / eatery Engine turn → Execution Plan + timeline labels.
 */

import assert from "node:assert/strict";
import { composeTravelTripBlueprint } from "../lib/context-blueprint/examples/travel-trip-execution-graph";
import {
  applyContextExecutionPlanToMetadata,
  applyEngineTurnToExecutionPlanMetadata,
  buildContextExecutionPlanFromBlueprint,
  patchTravelExecutionPlanForDestination,
  readContextExecutionPlanFromMetadata,
  readPlanStepByNodeId,
  startContextExecutionPlanRuntime,
} from "../lib/context-execution";
import {
  appendEngineEventToMetadata,
  readEngineEventsFromMetadata,
} from "../lib/engine/engine-event-metadata";
import { buildEngineEventTimelineRows } from "../lib/engine/format-engine-event-timeline";
import {
  resolveDiscoveryEngineId,
  resolveEngineIdFromDiscoveryKind,
  resolveEngineIdFromDiscoveryMessage,
  resolveEngineIdFromDiscoverySpec,
} from "../lib/engine/resolve-discovery-engine-id";

assert.equal(resolveEngineIdFromDiscoveryKind("amenity"), "local_amenity_search");
assert.equal(resolveEngineIdFromDiscoveryKind("eatery"), "eatery_search");
assert.equal(resolveEngineIdFromDiscoveryKind("activity"), "activity_search");
assert.equal(resolveEngineIdFromDiscoveryMessage("근처 약국 찾아줘"), "local_amenity_search");
assert.equal(resolveEngineIdFromDiscoveryMessage("스시 맛집 지도에 보여줘"), "eatery_search");
assert.equal(resolveEngineIdFromDiscoveryMessage("근처 놀거리 찾아줘"), "activity_search");
assert.equal(
  resolveEngineIdFromDiscoverySpec({ resourceTypes: ["amenity"] }),
  "local_amenity_search",
);
assert.equal(
  resolveEngineIdFromDiscoverySpec({ resourceTypes: ["restaurant"] }),
  "eatery_search",
);
assert.equal(
  resolveEngineIdFromDiscoverySpec({ resourceTypes: ["activity"] }),
  "activity_search",
);
assert.equal(
  resolveDiscoveryEngineId({
    message: "약국",
    recommendationKinds: ["amenity"],
  }),
  "local_amenity_search",
);

const blueprint = composeTravelTripBlueprint({
  contextId: "ctx-amenity-engine-turn",
  bridgeId: "bridge-amenity-engine-turn",
  runtimeId: "runtime-amenity-engine-turn",
  goal: "오사카 3박 4일",
});

const built = buildContextExecutionPlanFromBlueprint({
  blueprint,
  build: { contextId: "evt-amenity-engine-turn", goalKo: "오사카 3박 4일" },
});
assert.ok(built);

const atDestination = patchTravelExecutionPlanForDestination({
  blueprint,
  plan: built,
  contextId: "evt-amenity-engine-turn",
});
assert.ok(atDestination);

const running = startContextExecutionPlanRuntime({ plan: atDestination! });
let metadata = applyContextExecutionPlanToMetadata({
  metadata: {},
  plan: running,
});

const amenityFailed = applyEngineTurnToExecutionPlanMetadata({
  metadata,
  engineId: "local_amenity_search",
  kind: "scout_failed",
  lastError: "scout_empty",
});
assert.equal(amenityFailed.changed, true);
const exploreBlocked = readPlanStepByNodeId(
  readContextExecutionPlanFromMetadata(amenityFailed.metadata)!,
  "explore",
);
assert.equal(exploreBlocked?.status, "blocked");
assert.equal(exploreBlocked?.lastError, "scout_empty");

metadata = amenityFailed.metadata;
const amenityComplete = applyEngineTurnToExecutionPlanMetadata({
  metadata,
  engineId: "local_amenity_search",
  kind: "scout_complete",
});
assert.equal(amenityComplete.changed, true);
assert.equal(
  readPlanStepByNodeId(
    readContextExecutionPlanFromMetadata(amenityComplete.metadata)!,
    "explore",
  )?.status,
  "prepared",
);

const eateryFresh = applyContextExecutionPlanToMetadata({
  metadata: {},
  plan: running,
});
const eateryMain = applyEngineTurnToExecutionPlanMetadata({
  metadata: eateryFresh,
  engineId: "eatery_search",
  kind: "main_selected",
});
assert.equal(eateryMain.changed, true);
assert.equal(
  readPlanStepByNodeId(
    readContextExecutionPlanFromMetadata(eateryMain.metadata)!,
    "explore",
  )?.status,
  "prepared",
);

const withEvents = appendEngineEventToMetadata({
  metadata: eateryMain.metadata,
  engineId: "local_amenity_search",
  kind: "scout_failed",
  executionNodeId: "explore",
  payload: { error: "scout_empty" },
});
const withEatery = appendEngineEventToMetadata({
  metadata: withEvents,
  engineId: "eatery_search",
  kind: "main_selected",
  executionNodeId: "explore",
  payload: { placeId: "eatery-1" },
});
const timeline = buildEngineEventTimelineRows(readEngineEventsFromMetadata(withEatery));
assert.ok(
  timeline.some((row) => row.labelKo === "편의 찾기 실패"),
  "amenity scout_failed timeline",
);
assert.ok(
  timeline.some((row) => row.labelKo === "맛집 고정"),
  "eatery main_selected timeline",
);

console.log("test-amenity-eatery-engine-turn: ok");
