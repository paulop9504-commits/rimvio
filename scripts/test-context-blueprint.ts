import assert from "node:assert/strict";
import {
  composeContextBlueprint,
  composeJapanTravelBlueprintWithGraphs,
  composeJapanTravelCapabilityBundle,
  composeJapanTravelExecutionSpaceHypothesis,
  composeOsakaTravelExecutionSpace,
  composeTradeExecutionGraph,
  composeTravelTripBlueprint,
  confirmJapanTravelDestinationOsaka,
  hasUnresolvedExecutionSpaceSlots,
  readSpatialTargetForNode,
  readUnresolvedCapabilities,
  readUnresolvedExecutionNodes,
  resolveExecutionSpaceContext,
} from "../lib/context-blueprint";

const travelBlueprint = composeTravelTripBlueprint({ contextId: "evt-trip-method2" });
assert.equal(travelBlueprint.contractVersion, 7);
assert.ok(travelBlueprint.runtimeId.startsWith("rt-"));
assert.equal(travelBlueprint.contextId, "evt-trip-method2");
assert.equal(travelBlueprint.bridgeId, "bridge-evt-trip-method2");
assert.equal(travelBlueprint.executionGraph?.nodes.length, 7);
assert.equal(readUnresolvedExecutionNodes(travelBlueprint.executionGraph!).length, 1);
const staySpatial = readSpatialTargetForNode(travelBlueprint.spatialTargets, "stay");
assert.equal(staySpatial?.label, "오사카");
assert.equal(staySpatial?.resolution, "unresolved");
const prepareNode = travelBlueprint.executionGraph?.nodes.find((row) => row.id === "prepare");
assert.equal(prepareNode?.actions.length, 3);

const tradeGraph = composeTradeExecutionGraph();
assert.equal(tradeGraph.nodes.find((row) => row.id === "negotiation")?.actions[0]?.kind, "chat");

const { capabilityGraph, executionGraph } = composeJapanTravelCapabilityBundle();
assert.equal(capabilityGraph.graphKind, "capability_graph");
assert.equal(executionGraph.graphKind, "execution_graph");
assert.equal(capabilityGraph.capabilities.length, 7);
assert.equal(readUnresolvedCapabilities(capabilityGraph).length, 1);
assert.equal(
  capabilityGraph.capabilities.find((row) => row.kind === "lodging")?.resolution,
  "unresolved",
);
assert.equal(executionGraph.nodes.find((row) => row.id === "exec-lodging")?.kind, "allocate");

const hypothesisSpace = composeJapanTravelExecutionSpaceHypothesis({
  originLabel: "Home (대한민국 대전)",
});

const japanGraphBlueprint = composeJapanTravelBlueprintWithGraphs({
  contextId: "evt-japan-graph",
  spatialPlan: hypothesisSpace,
});
assert.equal(japanGraphBlueprint.contractVersion, 7);
assert.equal(japanGraphBlueprint.executionGraph?.nodes.length, 5);
assert.equal(japanGraphBlueprint.capabilityGraph?.capabilities.length, 7);

assert.equal(hypothesisSpace.graphKind, "spatial_execution_graph");
assert.equal(hasUnresolvedExecutionSpaceSlots(hypothesisSpace), true);
assert.equal(hypothesisSpace.slots[0]?.resolution, "unresolved");
assert.equal(hypothesisSpace.slots[0]?.candidates.length, 3);

const japanBlueprint = composeContextBlueprint({
  containerKind: "travel",
  contextId: "evt-japan",
  goal: "일본 여행",
  spatialPlan: hypothesisSpace,
  resourcePlan: {
    requiredResources: ["flight", "lodging"],
    knownTruth: [],
    emptySlots: ["destination", "lodging_place"],
    nextQuestion: {
      slotId: "destination",
      promptKo: "어디부터 시작할까요? 오사카 · 도쿄 · 후쿠오카",
    },
  },
  assignedExecutors: ["travel"],
  approvalPolicy: "manual",
});

assert.equal(japanBlueprint.spatialPlan?.slots[0]?.resolution, "unresolved");

const confirmedSpace = confirmJapanTravelDestinationOsaka(hypothesisSpace);
assert.equal(hasUnresolvedExecutionSpaceSlots(confirmedSpace), false);
assert.equal(
  confirmedSpace.slots.find((row) => row.slotId === "destination")?.selectedCandidateId,
  "osaka",
);

const osakaSpace = composeOsakaTravelExecutionSpace();
const osakaBlueprint = composeContextBlueprint({
  containerKind: "travel",
  contextId: "evt-osaka-oct",
  goal: "10월 일본 오사카 여행",
  spatialPlan: osakaSpace,
  resourcePlan: {
    requiredResources: ["flight", "lodging", "transit", "eatery"],
    knownTruth: [
      { slotId: "destination_city", value: "Osaka", source: "user_stated" },
    ],
    emptySlots: ["lodging_place"],
    nextQuestion: null,
  },
  assignedExecutors: ["travel", "lodging"],
});

assert.equal(osakaBlueprint.contractVersion, 7);
assert.equal(osakaBlueprint.spatialPlan?.origin.resolution, "confirmed");

const nearIncheon = resolveExecutionSpaceContext({
  space: osakaSpace,
  userLat: 37.4602,
  userLng: 126.4407,
});
assert.equal(nearIncheon.currentAnchor?.id, "incheon-airport");

console.log("test-context-blueprint: ok");
