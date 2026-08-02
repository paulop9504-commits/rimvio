/**
 * Smoke: Workspace State Model — Instance ≠ Reality, History rollback.
 */
import assert from "node:assert/strict";
import {
  createRealityObject,
  getRealityObject,
  clearRealityObjects,
} from "@/lib/reality-object/reality-object-store";
import {
  assertDoesNotMutateRealityObject,
  clearAllWorkspaceHistoryForTests,
  clearAllWorkspacesForTests,
  createWorkspace,
  listWorkspaceHistory,
  patchWorkspaceObject,
  readWorkspace,
  redoWorkspace,
  rollbackWorkspace,
  setWorkspaceFilter,
} from "@/lib/workspace";

clearRealityObjects();
clearAllWorkspacesForTests();
clearAllWorkspaceHistoryForTests();

assert.throws(() => assertDoesNotMutateRealityObject("mutate_reality"));
assert.doesNotThrow(() => assertDoesNotMutateRealityObject("patch_object"));

const reality = createRealityObject({
  objectId: "reality_hotel_1",
  entityId: "ent_1",
  contextId: "ctx_ws_model",
  kind: "hotel",
  labelKo: "Namba Hotel",
  relationships: [],
  availableActions: ["prepare"],
  metadata: { price: "120,000원" },
});
const realityUpdatedAt = reality.updatedAt;

const ws = createWorkspace({
  id: "ws_model_1",
  contextId: "ctx_ws_model",
  seeds: [
    {
      realityObjectId: reality.objectId,
      kind: "hotel",
      title: "Namba Hotel",
      priceLabelKo: "120,000원",
      rating: 8.2,
      tags: ["reservable"],
    },
  ],
});

assert.equal(ws.objects.length, 1);
assert.equal(ws.objects[0]!.realityObjectId, "reality_hotel_1");
assert.equal(ws.objects[0]!.title, "Namba Hotel");

const objectId = ws.objects[0]!.id;
const patched = patchWorkspaceObject({
  workspaceId: ws.id,
  objectId,
  patch: {
    title: "Namba Hotel · Draft",
    priceLabelKo: "98,000원",
    selected: true,
    attrs: { note: "workspace-only" },
  },
  labelKo: "가격 Draft 수정",
});
assert.ok(patched);
assert.equal(patched!.objects[0]!.title, "Namba Hotel · Draft");
assert.equal(patched!.objects[0]!.priceLabelKo, "98,000원");
assert.equal(patched!.revision, 1);

// Reality Object must stay untouched
const realityAfter = getRealityObject("reality_hotel_1");
assert.ok(realityAfter);
assert.equal(realityAfter!.labelKo, "Namba Hotel");
assert.equal(realityAfter!.updatedAt, realityUpdatedAt);
assert.equal(realityAfter!.metadata.price, "120,000원");

setWorkspaceFilter({
  workspaceId: ws.id,
  key: "maxPriceBand",
  labelKo: "저렴",
  value: 2,
});
assert.equal(readWorkspace(ws.id)!.filters.length, 1);
assert.equal(listWorkspaceHistory(ws.id).length, 2);

const hist = listWorkspaceHistory(ws.id);
assert.ok(hist[0]!.before);
assert.ok(hist[0]!.mutation);
assert.ok(hist[0]!.after);

const rolled = rollbackWorkspace(ws.id);
assert.ok(rolled);
assert.equal(rolled!.filters.length, 0);
assert.equal(rolled!.objects[0]!.title, "Namba Hotel · Draft");

const rolled2 = rollbackWorkspace(ws.id);
assert.ok(rolled2);
assert.equal(rolled2!.objects[0]!.title, "Namba Hotel");
assert.equal(rolled2!.revision, 0);

// Reality still pristine after rollbacks
assert.equal(getRealityObject("reality_hotel_1")!.updatedAt, realityUpdatedAt);

const redone = redoWorkspace(ws.id);
assert.ok(redone);
assert.equal(redone!.objects[0]!.title, "Namba Hotel · Draft");

clearAllWorkspacesForTests();
clearAllWorkspaceHistoryForTests();
clearRealityObjects();

console.log("ok workspace-state-model instance≠reality history-rollback");
