/**
 * Engine turn → Execution Plan step sync (scout_failed → blocked).
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

const blueprint = composeTravelTripBlueprint({
  contextId: "ctx-engine-turn",
  bridgeId: "bridge-engine-turn",
  runtimeId: "runtime-engine-turn",
  goal: "오사카 3박 4일",
});

const built = buildContextExecutionPlanFromBlueprint({
  blueprint,
  build: { contextId: "evt-engine-turn", goalKo: "오사카 3박 4일" },
});
assert.ok(built);

const atDestination = patchTravelExecutionPlanForDestination({
  blueprint,
  plan: built,
  contextId: "evt-engine-turn",
});
assert.ok(atDestination);
assert.equal(readPlanStepByNodeId(atDestination!, "stay")?.status, "running");

const running = startContextExecutionPlanRuntime({ plan: atDestination! });
const metadata = applyContextExecutionPlanToMetadata({
  metadata: {},
  plan: running,
});

const failed = applyEngineTurnToExecutionPlanMetadata({
  metadata,
  engineId: "lodging_search",
  kind: "scout_failed",
  lastError: "no_main_recommendation",
});
assert.equal(failed.changed, true);

const plan = readContextExecutionPlanFromMetadata(failed.metadata);
assert.ok(plan);
const stay = readPlanStepByNodeId(plan!, "stay");
assert.equal(stay?.status, "blocked");
assert.equal(stay?.lastError, "no_main_recommendation");

const withEvent = appendEngineEventToMetadata({
  metadata: failed.metadata,
  engineId: "lodging_search",
  kind: "scout_failed",
  executionNodeId: "stay",
  payload: { error: "no_main_recommendation" },
});
const timeline = buildEngineEventTimelineRows(readEngineEventsFromMetadata(withEvent));
assert.ok(
  timeline.some((row) => row.labelKo === "숙소 찾기 실패"),
  "scout_failed timeline label",
);

console.log("test-engine-turn-plan-sync: ok");
