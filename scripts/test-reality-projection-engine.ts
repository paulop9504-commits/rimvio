/**
 * Smoke: Reality Projection Engine — OBJECT_VISIBLE_CHANGED, Reality RO.
 */
import assert from "node:assert/strict";
import {
  PROJECTION_EVENT_TYPES,
  clearProjectionForTests,
  listProjectionEvents,
  projectDraftMutationApplied,
  readProjectionSnapshot,
  runProjectionHandler,
} from "@/lib/projection-engine";
import {
  applyDraftMutation,
  clearDraftMutationsForTests,
  clearCommandHistoryForTests,
  runWorkspaceCommandRuntime,
} from "@/lib/workspace-command";
import {
  clearAllWorkspacesForTests,
  clearAllWorkspaceHistoryForTests,
  createWorkspace,
  readWorkspace,
} from "@/lib/workspace";
import {
  clearRealityObjects,
  createRealityObject,
  getRealityObject,
} from "@/lib/reality-object/reality-object-store";
import { openMapContextWorkspace } from "@/lib/context-workspace/open-map-workspace";
import {
  clearContextWorkspace,
  readContextWorkspace,
} from "@/lib/context-workspace/workspace-store";

assert.ok(PROJECTION_EVENT_TYPES.includes("OBJECT_VISIBLE_CHANGED"));

clearRealityObjects();
clearAllWorkspacesForTests();
clearAllWorkspaceHistoryForTests();
clearDraftMutationsForTests();
clearProjectionForTests();
clearCommandHistoryForTests();

const eventId = "ws-proj-capsule";
clearContextWorkspace(eventId);

const r1 = createRealityObject({
  objectId: "reality_biz_p",
  entityId: "e1",
  contextId: eventId,
  kind: "hotel",
  labelKo: "Business Hotel",
  relationships: [],
  availableActions: [],
  metadata: {},
});
const r2 = createRealityObject({
  objectId: "reality_cap_p",
  entityId: "e2",
  contextId: eventId,
  kind: "hotel",
  labelKo: "Capsule Hotel",
  relationships: [],
  availableActions: [],
  metadata: {},
});
const r1At = r1.updatedAt;
const r2At = r2.updatedAt;

openMapContextWorkspace({
  contextEventId: eventId,
  domain: "lodging",
  query: "오사카",
  summaryKo: "오사카",
  source: "test",
  candidates: [
    {
      id: "reality_biz_p",
      labelKo: "Business Hotel",
      domain: "lodging",
      lat: 34.66,
      lng: 135.5,
      rating: 8,
      priceBand: 3,
      amountLabel: "120,000원",
      reservable: true,
      localFavorite: false,
      source: "maps",
    },
    {
      id: "reality_cap_p",
      labelKo: "Capsule Hotel",
      domain: "lodging",
      lat: 34.67,
      lng: 135.51,
      rating: 7,
      priceBand: 1,
      amountLabel: "40,000원",
      reservable: true,
      localFavorite: false,
      source: "maps",
    },
  ],
});

createWorkspace({
  id: eventId,
  contextId: eventId,
  seeds: [
    {
      realityObjectId: "reality_biz_p",
      kind: "hotel",
      title: "Business Hotel",
      attrs: { category: "business" },
    },
    {
      realityObjectId: "reality_cap_p",
      kind: "hotel",
      title: "Capsule Hotel",
      tags: ["capsule"],
      attrs: { hotelType: "capsule", category: "capsule" },
    },
  ],
});

const before = readWorkspace(eventId)!;
assert.equal(before.objects.filter((o) => o.visible).length, 2);

const runtime = runWorkspaceCommandRuntime({
  workspaceId: eventId,
  rawText: "캡슐호텔만 보고 싶어",
});
assert.ok(runtime.ok && runtime.proposal);

const applied = applyDraftMutation(runtime.ok ? runtime.proposal!.draft.id : "");
assert.equal(applied.ok, true);
if (applied.ok) {
  assert.ok((applied.projectionEventCount ?? 0) >= 1);
}

const events = listProjectionEvents(eventId);
assert.ok(events.some((e) => e.type === "OBJECT_VISIBLE_CHANGED"));
const vis = events.find((e) => e.type === "OBJECT_VISIBLE_CHANGED")!;
assert.equal(vis.payload.hotelType, "capsule");
assert.ok(Array.isArray(vis.payload.changes));

const snap = readProjectionSnapshot(eventId);
assert.ok(snap);
assert.equal(snap!.visibleObjectIds.length, 1);
assert.equal(snap!.hotelType, "capsule");

const ctx = readContextWorkspace(eventId)!;
const visibleCtx = ctx.nodes.filter((n) => n.visible);
assert.equal(visibleCtx.length, 1);
assert.ok(/capsule|캡슐/i.test(visibleCtx[0]!.title));

// Reality originals untouched
assert.equal(getRealityObject("reality_biz_p")!.updatedAt, r1At);
assert.equal(getRealityObject("reality_cap_p")!.updatedAt, r2At);

clearContextWorkspace(eventId);
clearAllWorkspacesForTests();
clearDraftMutationsForTests();
clearProjectionForTests();
clearRealityObjects();

console.log("ok reality-projection-engine OBJECT_VISIBLE_CHANGED");
