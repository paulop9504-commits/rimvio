import assert from "node:assert/strict";
import { composeTravelTripBlueprint } from "../lib/context-blueprint/examples/travel-trip-execution-graph";
import {
  gateContainerAIRequest,
  readContainerAIContext,
  readContainerAIUserLabel,
} from "../lib/container-ai";

const blueprint = composeTravelTripBlueprint({
  contextId: "evt-osaka-trip",
  runtimeId: "trip-runtime-001",
  goal: "오사카 여행",
});
assert.equal(blueprint.contextId, "evt-osaka-trip");
assert.equal(blueprint.runtimeId, "trip-runtime-001");

const prepareCtx = readContainerAIContext({
  blueprint,
  activeNodeId: "prepare",
});
assert.ok(prepareCtx);
assert.equal(prepareCtx.activeNode.kind, "prepare");

const stayCtx = readContainerAIContext({
  blueprint,
  activeNodeId: "stay",
});
assert.ok(stayCtx);
assert.equal(stayCtx.activeNode.kind, "stay");
assert.equal(stayCtx.destinationLabel, "오사카");
assert.equal(stayCtx.destinationResolution, "unresolved");

const blocked = gateContainerAIRequest({
  blueprint,
  userMessage: "주변 호텔 찾아줘",
  activeNodeId: "prepare",
});
assert.equal(blocked.allowed, false);
if (!blocked.allowed) {
  assert.match(blocked.reasonKo, /Prepare/);
  assert.equal(blocked.destinationChoices.length, 3);
}

const stayBlocked = gateContainerAIRequest({
  blueprint,
  userMessage: "주변 호텔",
  activeNodeId: "stay",
});
assert.equal(stayBlocked.allowed, false);

const similarPrice = gateContainerAIRequest({
  blueprint,
  userMessage: "비슷한 가격 숙소",
  activeNodeId: "departure",
});
assert.equal(similarPrice.allowed, false);

const walkRoute = gateContainerAIRequest({
  blueprint,
  userMessage: "걸어서 5분",
  activeNodeId: "stay",
});
if (walkRoute.allowed) {
  assert.equal(walkRoute.routeModule, "context_condition_ai");
}

assert.equal(readContainerAIUserLabel("travel"), "Trip Assistant");

console.log("test-container-ai: ok");
