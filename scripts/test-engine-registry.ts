import assert from "node:assert/strict";
import {
  appendEngineEventToMetadata,
  detectRimvioEnginesForMessage,
  getRimvioEnginePackageById,
  listRimvioEnginePackages,
  listRimvioEngines,
  lodgingSearchEnginePackage,
  planRimvioEngineTurn,
  primaryExecutionNodeForEngine,
  readEngineEventsFromMetadata,
  readRimvioEngineRunState,
  resolveEngineOperatorTurn,
  resolveExecutionNodesForEngine,
} from "../lib/engine";
import { planOneShotFlightPrep } from "../lib/globe/flight-prep/plan-one-shot-flight-prep";
import {
  listPublishedEngineManifests,
  resolveEngineCapabilityIds,
} from "../lib/marketplace/engine-market-registry";
import { gateOperatorTurnSync } from "../lib/globe/operator-turn/gate-operator-turn";
import type { OperatorTurnSsot } from "../lib/globe/operator-turn/types";

const ssot = {
  contextEventId: "evt-engine-test",
  scoutContract: null,
  selectedAnchor: null,
  lensSession: null,
  lastBatch: null,
  reelKinds: [],
  reelItemCount: 0,
  composeTail: [],
  hasActiveSpec: false,
  explorationMode: "diffuse",
} as unknown as OperatorTurnSsot;

assert.equal(listRimvioEngines().length, 8);
assert.equal(listRimvioEnginePackages().length, 8);

for (const pkg of listRimvioEnginePackages()) {
  assert.ok(pkg.goal.id, `${pkg.id} goal`);
  assert.ok(pkg.policy.requiresHumanCommit, `${pkg.id} commit gate`);
  assert.ok(pkg.workflow.length >= 8, `${pkg.id} workflow`);
  assert.ok(pkg.tools.length >= 2, `${pkg.id} tools`);
  assert.ok(pkg.events.length >= 2, `${pkg.id} events`);
  assert.ok(pkg.memory.length >= 2, `${pkg.id} memory`);
  assert.ok(pkg.capabilities.length >= 1, `${pkg.id} capabilities`);
  assert.ok(pkg.executionNodeIds.length >= 1, `${pkg.id} nodes`);
  assert.equal(getRimvioEnginePackageById(pkg.id)?.id, pkg.id);
}

const lodgingPkg = lodgingSearchEnginePackage;
assert.equal(lodgingPkg.tools.some((row) => row.id === "BOOK_HOTEL"), true);
assert.equal(readRimvioEngineRunState({ engineId: "lodging_search", event: null }), "idle");

const flightMsg = "제주 항공권 예약 준비해";
assert.deepEqual(
  detectRimvioEnginesForMessage(flightMsg).map((row) => row.id),
  ["flight_booking"],
);

const lodgingMsg = "부산 서면쪽 숙소 예약 준비해";
assert.deepEqual(
  detectRimvioEnginesForMessage(lodgingMsg).map((row) => row.id),
  ["lodging_search"],
);

const transitMsg = "인천공항까지 택시 이동 찾아줘";
assert.deepEqual(
  detectRimvioEnginesForMessage(transitMsg).map((row) => row.id),
  ["transit_navigate"],
);

const financeMsg = "여행 예산 실속으로 결제 준비";
assert.deepEqual(
  detectRimvioEnginesForMessage(financeMsg).map((row) => row.id),
  ["finance_prep"],
);

const amenityMsg = "근처 약국 찾아줘";
assert.deepEqual(
  detectRimvioEnginesForMessage(amenityMsg).map((row) => row.id),
  ["local_amenity_search"],
);

const eateryMsg = "스시 맛집 지도에 보여줘";
assert.deepEqual(
  detectRimvioEnginesForMessage(eateryMsg).map((row) => row.id),
  ["eatery_search"],
);

const amenityGate = gateOperatorTurnSync({ text: amenityMsg, ssot, event: null });
assert.equal(amenityGate.tool, "scout");
assert.equal(amenityGate.reason, "instant_poi_search");

const eateryGate = gateOperatorTurnSync({ text: eateryMsg, ssot, event: null });
assert.equal(eateryGate.tool, "scout");
assert.equal(eateryGate.reason, "instant_eatery_search");

const activityMsg = "근처 놀거리 찾아줘";
assert.deepEqual(
  detectRimvioEnginesForMessage(activityMsg).map((row) => row.id),
  ["activity_search"],
);
const activityGate = gateOperatorTurnSync({ text: activityMsg, ssot, event: null });
assert.equal(activityGate.tool, "scout");
assert.equal(activityGate.reason, "instant_activity_search");

assert.equal(primaryExecutionNodeForEngine("local_amenity_search"), "explore");
assert.equal(primaryExecutionNodeForEngine("eatery_search"), "explore");
assert.equal(primaryExecutionNodeForEngine("activity_search"), "explore");

const flightPlan = planOneShotFlightPrep({ message: flightMsg, event: null });
assert.equal(flightPlan?.readyForHub, false);
assert.ok(flightPlan?.intakeGaps.includes("origin"));

const flightOperator = resolveEngineOperatorTurn({ text: flightMsg, event: null });
assert.equal(flightOperator?.tool, "ask_chips");

const gateFlight = gateOperatorTurnSync({ text: flightMsg, ssot, event: null });
assert.equal(gateFlight.tool, "ask_chips");

assert.equal(primaryExecutionNodeForEngine("flight_booking"), "departure");
assert.equal(primaryExecutionNodeForEngine("lodging_search"), "stay");
assert.equal(primaryExecutionNodeForEngine("transit_navigate"), "departure");
assert.equal(primaryExecutionNodeForEngine("finance_prep"), "prepare");

const manifests = listPublishedEngineManifests();
assert.ok(manifests.length >= 8);
assert.ok(
  manifests.some(
    (row) => row.engineId === "flight_booking" && row.capabilityIds.includes("BOOK_FLIGHT"),
  ),
);
assert.ok(
  manifests.some(
    (row) =>
      row.engineId === "local_amenity_search" && row.capabilityIds.includes("NAVIGATE"),
  ),
);
assert.ok(
  manifests.some(
    (row) => row.engineId === "eatery_search" && row.capabilityIds.includes("CONFIRM_PLACE"),
  ),
);

assert.deepEqual(resolveEngineCapabilityIds("flight_booking"), ["BOOK_FLIGHT", "CHECK_IN"]);
assert.ok(resolveExecutionNodesForEngine("transit_navigate").some((row) => row.nodeId === "arrival"));

const metadata = appendEngineEventToMetadata({
  metadata: {},
  engineId: "lodging_search",
  kind: "scout_complete",
  payload: { batchId: "batch-1" },
});
const events = readEngineEventsFromMetadata(metadata);
assert.equal(events.length, 1);
assert.equal(events[0]?.kind, "scout_complete");
assert.equal(events[0]?.engineId, "lodging_search");

console.log("test-engine-registry: ok");
