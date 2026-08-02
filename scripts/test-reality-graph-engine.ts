/**
 * Smoke: Reality Graph Engine — Entity + Relations + Query (no Workspace copy SSOT).
 */
import assert from "node:assert/strict";
import {
  REALITY_ENTITY_TYPES,
  REALITY_RELATION_KINDS,
  addRealityRelation,
  clearRealityGraphForTests,
  findNearby,
  findPath,
  findSimilar,
  getRelatedEntities,
  getRealityEntity,
  upsertRealityEntity,
} from "@/lib/reality-graph";
import {
  clearAllWorkspacesForTests,
  createWorkspace,
  createWorkspaceObjectRef,
  resolveWorkspaceEntity,
} from "@/lib/workspace";

assert.ok(REALITY_ENTITY_TYPES.includes("Hotel"));
assert.ok(REALITY_RELATION_KINDS.includes("LocatedNear"));

clearRealityGraphForTests();
clearAllWorkspacesForTests();

const hotel = upsertRealityEntity({
  id: "ent_hotel_a",
  type: "Hotel",
  properties: {
    name: "Hotel A",
    title: "Hotel A",
    lat: 34.665,
    lng: 135.502,
    category: "business",
    tags: "namba,business",
  },
});
const station = upsertRealityEntity({
  id: "ent_namba_station",
  type: "Place",
  properties: {
    name: "Namba Station",
    lat: 34.6627,
    lng: 135.5013,
  },
});
const trip = upsertRealityEntity({
  id: "ent_osaka_trip",
  type: "Event",
  properties: { name: "Osaka Trip" },
  state: { lifecycle: "selected" },
});
const route = upsertRealityEntity({
  id: "ent_usj_route",
  type: "Route",
  properties: { name: "USJ Route" },
});
const similarHotel = upsertRealityEntity({
  id: "ent_hotel_b",
  type: "Hotel",
  properties: {
    name: "Hotel B",
    category: "business",
    tags: "namba,business",
    lat: 34.666,
    lng: 135.503,
  },
});

assert.ok(
  addRealityRelation({
    kind: "LocatedNear",
    fromId: hotel.id,
    toId: station.id,
    properties: { meters: 350 },
  }),
);
assert.ok(
  addRealityRelation({
    kind: "UsedIn",
    fromId: hotel.id,
    toId: trip.id,
  }),
);
assert.ok(
  addRealityRelation({
    kind: "ConnectedTo",
    fromId: hotel.id,
    toId: route.id,
  }),
);
assert.ok(
  addRealityRelation({
    kind: "SimilarTo",
    fromId: hotel.id,
    toId: similarHotel.id,
  }),
);

const related = getRelatedEntities(hotel.id);
assert.ok(related.some((h) => h.relation.kind === "LocatedNear"));
assert.ok(related.some((h) => h.entity.id === station.id));
assert.ok(related.some((h) => h.relation.kind === "UsedIn"));
assert.ok(related.some((h) => h.entity.id === trip.id));
assert.ok(related.some((h) => h.relation.kind === "ConnectedTo"));

const path = findPath(hotel.id, route.id);
assert.ok(path);
assert.deepEqual([...path!.nodeIds], [hotel.id, route.id]);

const similar = findSimilar(hotel.id);
assert.ok(similar.some((e) => e.id === similarHotel.id));

const nearby = findNearby(hotel.id, { maxMeters: 2000 });
assert.ok(nearby.some((h) => h.entity.id === station.id));

// Workspace Object = Entity reference (same entity id, no second SSOT)
const wobj = createWorkspaceObjectRef({ entityId: hotel.id, kind: "hotel" });
assert.equal(wobj.entityId, hotel.id);
const resolved = resolveWorkspaceEntity(wobj);
assert.ok(resolved);
assert.equal(resolved!.id, hotel.id);
assert.equal(resolved!.properties.name, "Hotel A");

// Mutating Workspace local state must not require Entity copy
const ws = createWorkspace({
  id: "ws_graph_ref",
  contextId: "ctx_graph",
  seeds: [],
});
assert.equal(ws.objects.length, 0);

// Entity still single SSOT
assert.equal(getRealityEntity(hotel.id)?.properties.name, "Hotel A");

clearRealityGraphForTests();
clearAllWorkspacesForTests();

console.log(
  "ok reality-graph-engine Hotel→LocatedNear/UsedIn/ConnectedTo query+WorkspaceRef",
);
