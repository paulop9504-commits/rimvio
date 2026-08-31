import assert from "node:assert/strict";
import {
  enforcePaymentCommitPolicy,
  resolveCapabilityCompatibilityGraph,
} from "../lib/hub/dev/compatibility-validation-graph";

function testHotelSearchGraphValid(): void {
  const graph = resolveCapabilityCompatibilityGraph({
    capabilityId: "hotel.search",
    platformId: "platform.osaka-stay",
    utterance: "도쿄 호텔 찾아줘",
  });

  assert.ok(graph.runtimes.length > 0);
  assert.ok(graph.infrastructure.some((i) => i.compatible && i.id === "osaka.hotel.supplier"));
  assert.ok(graph.adapters.some((a) => a.compatible && a.id === "adapter.browser-hotel"));
  assert.equal(graph.graphValid, true);
}

function testPaymentCommitPolicy(): void {
  assert.ok(enforcePaymentCommitPolicy("payment.commit", "none"));
  assert.equal(enforcePaymentCommitPolicy("payment.commit", "user_required"), null);
}

function testIndustrialRequiresAdapter(): void {
  const graph = resolveCapabilityCompatibilityGraph({
    capabilityId: "vision.defect.detect",
  });
  assert.ok(graph.specification.requirements.runtimeTypes.includes("industrial"));
}

function main(): void {
  testHotelSearchGraphValid();
  testPaymentCommitPolicy();
  testIndustrialRequiresAdapter();
  console.log("test-compatibility-validation-graph: ok");
}

main();
