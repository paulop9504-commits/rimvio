/**
 * Reality Surface flow advance + bridge arc projection tests.
 * Run: npx tsx scripts/test-reality-surface-flow-advance.ts
 */

import assert from "node:assert/strict";
import { gateOperatorRequest } from "@/lib/operator";
import { compileGlobeIngress } from "@/lib/globe-ingress";
import {
  advanceRealitySurfaceDestination,
  blueprintNeedsDestination,
  composeRealitySurfaceFromGlobeIngress,
  projectBridgeMapArcs,
  resolveDestinationFromMessage,
} from "@/lib/reality-surface";

function testDestinationAdvance() {
  const compiled = compileGlobeIngress({ text: "일본 여행" });
  const session = composeRealitySurfaceFromGlobeIngress({
    compiled,
    eventId: "evt-japan",
  });
  assert.equal(blueprintNeedsDestination(session.operatorBlueprint), true);

  const advanced = advanceRealitySurfaceDestination({
    session,
    destinationLabel: "오사카",
  });
  assert.equal(blueprintNeedsDestination(advanced.operatorBlueprint), false);
  assert.equal(advanced.projection.bridge?.pathLabels[2], "오사카");
  assert.match(
    advanced.projection.flow?.nextStepHintKo ?? "",
    /오사카/,
  );
  assert.equal(advanced.projection.flow?.strokeStyle, "solid");
  console.log("✓ destination advance updates flow + bridge");
}

function testResolveDestinationFromMessage() {
  assert.equal(resolveDestinationFromMessage("오사카"), "오사카");
  assert.equal(resolveDestinationFromMessage("도쿄로 갈게"), "도쿄");
  console.log("✓ resolve destination from message");
}

function testOperatorGateAfterAdvance() {
  const compiled = compileGlobeIngress({ text: "일본 여행" });
  let session = composeRealitySurfaceFromGlobeIngress({
    compiled,
    eventId: "evt-japan",
  });
  const blocked = gateOperatorRequest({
    blueprint: session.operatorBlueprint,
    userMessage: "주변 호텔",
  });
  assert.equal(blocked.allowed, false);

  session = advanceRealitySurfaceDestination({
    session,
    destinationLabel: "오사카",
  });
  const allowed = gateOperatorRequest({
    blueprint: session.operatorBlueprint,
    userMessage: "주변 호텔",
    activeNodeId: session.projection.runtime?.activeFlowNodeId,
  });
  assert.equal(allowed.allowed, true);
  console.log("✓ operator gate opens after destination advance");
}

function testBridgeMapArcs() {
  const compiled = compileGlobeIngress({ text: "일본 여행" });
  const session = advanceRealitySurfaceDestination({
    session: composeRealitySurfaceFromGlobeIngress({
      compiled,
      eventId: "evt-japan",
    }),
    destinationLabel: "오사카",
  });
  const arcs = projectBridgeMapArcs({
    eventId: "evt-japan",
    projection: session.projection,
    userLat: 37.5665,
    userLng: 126.978,
  });
  assert.ok(arcs.length >= 2);
  assert.ok(arcs.some((arc) => arc.emphasis === "focused"));
  console.log("✓ bridge map arcs projected");
}

testDestinationAdvance();
testResolveDestinationFromMessage();
testOperatorGateAfterAdvance();
testBridgeMapArcs();
console.log("\nAll reality surface flow advance tests passed.");
