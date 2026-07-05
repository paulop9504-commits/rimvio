/**
 * Reality Surface projection from Globe Ingress.
 * Run: npx tsx scripts/test-reality-surface-projection.ts
 */

import assert from "node:assert/strict";
import { compileGlobeIngress } from "@/lib/globe-ingress";
import {
  composeRealitySurfaceFromGlobeIngress,
  REALITY_SURFACE_EXCLUDED_LAYERS,
  REALITY_SURFACE_INCLUDED_LAYERS,
} from "@/lib/reality-surface";

function testProjectionFromIngress() {
  const compiled = compileGlobeIngress({ text: "일본 여행" });
  const session = composeRealitySurfaceFromGlobeIngress({
    compiled,
    eventId: "evt-japan-trip",
  });

  assert.equal(session.eventId, "evt-japan-trip");
  assert.equal(session.projection.context?.goalKo, "일본 여행");
  assert.ok((session.projection.bridge?.pathLabels.length ?? 0) >= 3);
  assert.equal(session.projection.runtime?.runtimeId, compiled.runtime.runtimeId);
  assert.ok(session.projection.flow?.flowNodeIds.length);
  assert.ok(session.projection.flow?.nextStepHintKo);
  assert.equal(session.operatorBlueprint.contextId, compiled.context.contextId);
  console.log("✓ reality surface projection from ingress");
}

function testScopeConstants() {
  assert.ok(REALITY_SURFACE_INCLUDED_LAYERS.includes("bridge"));
  assert.ok(REALITY_SURFACE_EXCLUDED_LAYERS.includes("blueprint"));
  console.log("✓ scope constants");
}

testProjectionFromIngress();
testScopeConstants();
console.log("\nAll reality surface projection tests passed.");
