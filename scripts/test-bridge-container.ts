import assert from "node:assert/strict";
import { composeContextBlueprint } from "../lib/context-blueprint";
import { assertContextHasNoFlow } from "../lib/context-os/vocabulary-v2";
import { composeRuntime } from "../lib/runtime";

const contextId = "evt-osaka-trip";
const runtime2026 = composeRuntime({
  contextId,
  runtimeKind: "travel",
  runtimeId: "trip-runtime-001",
});
const runtime2028 = composeRuntime({
  contextId,
  runtimeKind: "travel",
  runtimeId: "trip-runtime-002",
});

assert.equal(runtime2026.contextId, runtime2028.contextId);
assert.equal(runtime2026.bridgeId, runtime2028.bridgeId);
assert.notEqual(runtime2026.runtimeId, runtime2028.runtimeId);

const blueprint = composeContextBlueprint({
  contextId,
  runtimeId: runtime2026.runtimeId,
  containerKind: "travel",
  goal: "오사카 여행",
});
assert.equal(blueprint.contextId, contextId);
assert.equal(blueprint.runtimeId, "trip-runtime-001");

assert.throws(
  () => assertContextHasNoFlow({ flow: { nodes: [] } }),
  /forbidden runtime field/,
);
assert.doesNotThrow(() => assertContextHasNoFlow({ travelYear: 2026 }));

console.log("test-bridge-container: ok");
