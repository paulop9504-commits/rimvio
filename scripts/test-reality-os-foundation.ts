/**
 * Smoke: Reality OS Architecture Foundation — constitution · layers · gates.
 * Additive only — does not remove existing Reality OS primitives.
 */
import assert from "node:assert/strict";
import {
  REALITY_OS_LAYERS,
  REALITY_OS_LOOP,
  REALITY_OS_PRINCIPLES,
  REALITY_OS_PRODUCT_IDENTITY,
  REALITY_PRIMITIVES,
  assertAiCannotCommit,
  assertNoDirectRealityMutation,
  buildPrepareToCommitInterface,
  buildRealityToGlobeInterface,
  canTransitionRealityOsLayer,
  clearRealityOsEventListenersForTests,
  describeRealityOsArchitecture,
  emitRealityOsEvent,
  gateRealityOsOperation,
  listRealityOsLayerInterfaces,
  makeRealityOsEventBase,
  resolveRealityOsModules,
  subscribeRealityOsEvents,
  validateRealityOsTransition,
} from "@/lib/reality-os";

clearRealityOsEventListenersForTests();

// Identity
assert.equal(REALITY_OS_PRODUCT_IDENTITY.isTravelApp, false);
assert.equal(REALITY_OS_PRODUCT_IDENTITY.isRealityOperatingSystem, true);

// Layers
assert.deepEqual([...REALITY_OS_LAYERS], [
  "globe",
  "context",
  "reality_graph",
  "workspace",
  "agent",
  "draft",
  "simulation",
  "prepare",
  "commit",
]);

assert.ok(REALITY_OS_LOOP.includes("human_commit"));
assert.ok(REALITY_OS_PRINCIPLES.AI_HAS_NO_COMMIT_AUTHORITY);
assert.ok(REALITY_OS_PRINCIPLES.GLOBE_IS_REALITY_VIEW);

const arch = describeRealityOsArchitecture();
assert.equal(arch.layers.length, 9);
assert.ok(resolveRealityOsModules("commit").some((m) => m.includes("reality-commit")));
assert.ok(resolveRealityOsModules("agent").includes("lib/workspace-agent"));

// Transitions
assert.equal(canTransitionRealityOsLayer("prepare", "commit"), true);
assert.equal(canTransitionRealityOsLayer("agent", "commit"), false);
assert.equal(canTransitionRealityOsLayer("simulation", "commit"), false);
assert.equal(validateRealityOsTransition({ from: "agent", to: "commit" }).ok, false);
assert.equal(validateRealityOsTransition({ from: "prepare", to: "commit" }).ok, true);

// Constitution gates
assert.throws(() => assertAiCannotCommit("ai"));
assert.throws(() => assertAiCannotCommit("agent"));
assert.throws(() => assertNoDirectRealityMutation("mutate_reality"));

assert.equal(
  gateRealityOsOperation({ op: "commit", source: "ai", userApproved: true }).ok,
  false,
);
assert.equal(
  gateRealityOsOperation({
    op: "commit",
    source: "field",
    userApproved: false,
  }).ok,
  false,
);
assert.equal(
  gateRealityOsOperation({
    op: "commit",
    source: "field",
    userApproved: true,
  }).ok,
  true,
);

// Interfaces
const interfaces = listRealityOsLayerInterfaces();
assert.ok(interfaces.length >= 7);
const prepCommit = buildPrepareToCommitInterface({ prepareId: "prep_1" });
assert.equal(prepCommit.requiresUserApproval, true);
assert.equal(prepCommit.status, "ready_for_commit");
const globe = buildRealityToGlobeInterface();
assert.equal(globe.viewOnly, true);
assert.equal(globe.editor, false);

// Events
let seen = 0;
const unsub = subscribeRealityOsEvents((e) => {
  if (e.name === "rimvio:reality-os:prepare-ready") seen += 1;
});
emitRealityOsEvent({
  ...makeRealityOsEventBase({
    name: "rimvio:reality-os:prepare-ready",
    layer: "prepare",
    workspaceId: "ws",
  }),
  name: "rimvio:reality-os:prepare-ready",
  prepareId: "prep_1",
  status: "ready_for_commit",
});
assert.equal(seen, 1);
unsub();

// Existing primitives still exported (no deletion)
assert.ok(REALITY_PRIMITIVES.includes("spatial"));
assert.ok(REALITY_PRIMITIVES.includes("ledger"));

clearRealityOsEventListenersForTests();

console.log(
  "ok reality-os-foundation constitution·9-layers·interfaces·gates·primitives-preserved",
);
