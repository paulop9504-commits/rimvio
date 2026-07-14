/**
 * Globe Ingress compiler smoke test.
 * Run: npx tsx scripts/test-globe-ingress.ts
 */

import assert from "node:assert/strict";
import {
  compileGlobeIngress,
  GLOBE_INGRESS_FORBIDDEN_REENTRY,
  isGlobeIngressEligible,
} from "@/lib/globe-ingress";

function testTravelIngress() {
  const intent = "일본 여행";
  assert.equal(isGlobeIngressEligible(intent), true);

  const compiled = compileGlobeIngress({ text: intent });
  assert.equal(compiled.intent, intent);
  assert.ok(compiled.context.contextId.startsWith("ctx-"));
  assert.equal(compiled.context.runtimeKind, "travel");
  assert.ok(compiled.bridge.pathLabels.length >= 3);
  assert.equal(compiled.runtime.runtimeKind, "travel");
  assert.equal(compiled.runtime.contextId, compiled.context.contextId);
  assert.equal(compiled.blueprint.contextId, compiled.context.contextId);
  assert.equal(compiled.blueprint.runtimeId, compiled.runtime.runtimeId);
  assert.equal(compiled.blueprint.containerKind, "travel");
  assert.ok(compiled.blueprint.executionGraph?.nodes.length > 0);

  const region = compiled.context.slots.find((s) => s.key === "region");
  const destination = compiled.context.slots.find((s) => s.key === "destination");
  assert.equal(region?.resolution, "hypothesis");
  assert.ok(
    region?.value === "일본" || region?.value === "Japan",
    `expected Japan region, got ${String(region?.value)}`,
  );
  assert.equal(destination?.value, "unresolved");
  assert.equal(destination?.resolution, "unresolved");
  assert.equal(compiled.blueprint.spatialTargets?.byNodeId?.stay?.resolution, "unresolved");
  assert.notEqual(compiled.bridge.pathLabels[2], "오사카");
  assert.ok(
    compiled.blueprint.resourcePlan.nextQuestion?.promptKo?.includes("오사카"),
  );
  console.log("✓ travel ingress compile (Japan region hypothesis)");
}

function testLodgingOnlyExcluded() {
  const intent = "오사카 호텔 찾아줘";
  assert.equal(isGlobeIngressEligible(intent), false);
  console.log("✓ lodging-only excluded from ingress");
}

function testUnidirectionalLaw() {
  assert.deepEqual(GLOBE_INGRESS_FORBIDDEN_REENTRY, [
    "blueprint_to_runtime",
    "bridge_to_intent",
    "context_to_runtime_skip",
  ]);
  console.log("✓ forbidden re-entry constants");
}

function testExistingContextId() {
  const compiled = compileGlobeIngress({
    text: "도쿄 출장",
    existingContextId: "evt-existing-123",
  });
  assert.equal(compiled.context.contextId, "evt-existing-123");
  console.log("✓ existing context id preserved");
}

testTravelIngress();
testLodgingOnlyExcluded();
testUnidirectionalLaw();
testExistingContextId();
console.log("\nAll globe ingress tests passed.");
