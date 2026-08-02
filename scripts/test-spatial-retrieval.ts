/**
 * Smoke: Spatial Retrieval — Anchor Resolver + Entity Resolver schema
 *
 * 완료 조건:
 *   Intent 생성
 *   → anchorEntity = Namba Hotel
 *   → Entity Resolver { anchorId, type, location, contextId }
 *   → ambiguous → ≤3 candidate Projection (askUser=false, no chat ask)
 */
import assert from "node:assert/strict";
import {
  parseSpatialDiscoveryIntent,
  resolveSpatialAnchorDetailed,
  runSpatialRetrieval,
  SPATIAL_DISCOVERY_TYPE,
} from "@/lib/spatial-retrieval";

const utterance = "난바 호텔 기준 맛집 찾아줘";

const parsed = parseSpatialDiscoveryIntent(utterance);
assert.ok(parsed, "SPATIAL_DISCOVERY Intent 파싱");
assert.equal(parsed!.type, SPATIAL_DISCOVERY_TYPE);
assert.equal(parsed!.targetEntity, "restaurant");
assert.equal(parsed!.anchorEntity, "hotel");
assert.equal(parsed!.relation, "nearby");

console.log("\n── Spatial Retrieval Pipeline ──");
console.log(`User Command · ${utterance}\n`);

const result = runSpatialRetrieval({
  text: utterance,
  workspaceId: "ws-osaka-trip",
  contextTitleKo: "Osaka Trip",
  candidates: [
    {
      entityId: "hotel_123",
      titleKo: "Namba Hotel",
      kind: "hotel",
      lat: 34.6654,
      lng: 135.501,
      selected: true,
    },
    {
      entityId: "hotel_umeda",
      titleKo: "Umeda Business Hotel",
      kind: "hotel",
      lat: 34.705,
      lng: 135.498,
    },
  ],
  log: true,
});

assert.equal(result.ok, true);
if (!result.ok) throw new Error(result.reasonKo);

assert.equal(result.intent.type, "SPATIAL_DISCOVERY");
assert.equal(result.anchor.labelKo, "Namba Hotel");
assert.equal(result.intent.targetEntity, "restaurant");
assert.equal(result.intent.relation, "nearby");

// Entity Resolver schema
assert.equal(result.resolver.anchorId, "hotel_123");
assert.equal(result.resolver.type, "hotel");
assert.equal(result.resolver.location.lat, 34.6654);
assert.equal(result.resolver.location.lng, 135.501);
assert.equal(result.resolver.contextId, "osaka_trip");

const logText = result.logs.map((l) => l.message).join("\n");
assert.ok(logText.includes("Intent 생성"));
assert.ok(logText.includes("anchorEntity = Namba Hotel"));
assert.ok(logText.includes("targetEntity = Restaurant"));
assert.ok(logText.includes("relation = Nearby"));
assert.ok(logText.includes("source=selected"));

console.log("\n── Entity Resolver ──");
console.log(JSON.stringify(result.resolver, null, 2));

// Spatial Query Engine wire
assert.equal(result.query.radius, 1000);
assert.equal(result.query.category, "restaurant");
assert.deepEqual([...result.query.ranking], ["distance", "rating", "contextFit"]);
assert.ok(result.query.center);
assert.equal(result.query.engine.radius, 1000);
assert.equal(result.query.engine.category, "restaurant");

console.log("\n── Spatial Query ──");
console.log(
  JSON.stringify(
    {
      center: result.query.center,
      radius: result.query.radius,
      category: result.query.category,
      ranking: result.query.ranking,
    },
    null,
    2,
  ),
);

// Context Score — not distance-only (all entities have breakdown)
assert.ok(result.entities.length >= 1);
for (const e of result.entities) {
  assert.ok(e.contextScore, `contextScore on ${e.titleKo}`);
  assert.ok(e.contextScore!.total >= 0 && e.contextScore!.total <= 1);
  // weights present
  assert.ok("distance" in e.contextScore!);
  assert.ok("rating" in e.contextScore!);
  assert.ok("budgetFit" in e.contextScore!);
  assert.ok("scheduleFit" in e.contextScore!);
}
// Sorted by context score descending
for (let i = 1; i < result.entities.length; i++) {
  assert.ok(
    (result.entities[i - 1]!.contextScore!.total ?? 0) >=
      (result.entities[i]!.contextScore!.total ?? 0),
  );
}

// Reality Graph — not POI list
assert.ok(result.realityEntities.length >= 2);
const anchorNode = result.realityEntities.find((e) => e.id === "hotel_123");
assert.ok(anchorNode);
assert.equal(anchorNode!.type, "hotel");
assert.ok(Array.isArray(anchorNode!.contextLinks));

const restNode = result.realityEntities.find((e) => e.type === "restaurant");
assert.ok(restNode);
assert.equal(typeof restNode!.attributes.titleKo, "string");
assert.ok(Array.isArray(restNode!.contextLinks));

assert.ok(result.realityRelationships.length >= 1);
const edge = result.realityRelationships[0]!;
assert.equal(edge.from, "hotel_123");
assert.equal(edge.type, "nearby");
assert.ok("distance" in edge.metadata);
assert.ok("walkingTime" in edge.metadata);

// Projection Event pipeline → auto map pins
assert.ok(result.projectionEvents.some((e) => e.stage === "entity_created"));
assert.ok(result.projectionEvents.some((e) => e.stage === "map_update"));
assert.ok(result.projectionEvents.some((e) => e.stage === "marker_created"));
assert.ok(
  result.projectionEvents.some((e) => e.stage === "relationship_layer_update"),
);
assert.ok(result.projectionEvents.some((e) => e.stage === "callout_created"));
assert.ok(result.pins.some((p) => p.role === "discovered"));
assert.ok(result.pins.filter((p) => p.role === "discovered").length >= 1);

console.log("\n── Reality Graph ──");
console.log(`nodes=${result.realityEntities.length} edges=${result.realityRelationships.length}`);
console.log(
  JSON.stringify(result.realityRelationships[0], null, 2),
);

// Priority: selected wins over contextAnchor when both set differently
{
  const intent = parseSpatialDiscoveryIntent("호텔 근처 맛집 찾아줘")!;
  const r = resolveSpatialAnchorDetailed({
    intent,
    contextId: "osaka_trip",
    candidates: [
      {
        entityId: "hotel_selected",
        titleKo: "Selected Hotel",
        kind: "hotel",
        lat: 1,
        lng: 1,
        selected: true,
      },
      {
        entityId: "hotel_context",
        titleKo: "Context Hotel",
        kind: "hotel",
        lat: 2,
        lng: 2,
        contextAnchor: true,
      },
    ],
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.source, "selected");
    assert.equal(r.resolver.anchorId, "hotel_selected");
  }
}

// Priority: contextAnchor before recent
{
  const intent = parseSpatialDiscoveryIntent("호텔 근처 맛집 찾아줘")!;
  const r = resolveSpatialAnchorDetailed({
    intent,
    contextId: "osaka_trip",
    candidates: [
      {
        entityId: "hotel_context",
        titleKo: "Context Hotel",
        kind: "hotel",
        lat: 2,
        lng: 2,
        contextAnchor: true,
      },
      {
        entityId: "hotel_recent",
        titleKo: "Recent Hotel",
        kind: "hotel",
        lat: 3,
        lng: 3,
        recentInteraction: true,
      },
    ],
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.source, "context_anchor");
    assert.equal(r.resolver.anchorId, "hotel_context");
  }
}

// Priority: NL match when no flags ("난바")
{
  const intent = parseSpatialDiscoveryIntent(utterance)!;
  const r = resolveSpatialAnchorDetailed({
    intent,
    contextId: "osaka_trip",
    candidates: [
      {
        entityId: "hotel_umeda",
        titleKo: "Umeda Business Hotel",
        kind: "hotel",
        lat: 34.705,
        lng: 135.498,
      },
      {
        entityId: "hotel_123",
        titleKo: "Namba Hotel",
        kind: "hotel",
        lat: 34.6654,
        lng: 135.501,
      },
    ],
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.source, "nl_match");
    assert.equal(r.resolver.anchorId, "hotel_123");
  }
}

// Ambiguous: never ask — project ≤3 candidates
{
  const intent = parseSpatialDiscoveryIntent("호텔 근처 맛집 찾아줘")!;
  const r = resolveSpatialAnchorDetailed({
    intent,
    contextId: "osaka_trip",
    candidates: [
      {
        entityId: "h1",
        titleKo: "Hotel A",
        kind: "hotel",
        lat: 1,
        lng: 1,
      },
      {
        entityId: "h2",
        titleKo: "Hotel B",
        kind: "hotel",
        lat: 2,
        lng: 2,
      },
      {
        entityId: "h3",
        titleKo: "Hotel C",
        kind: "hotel",
        lat: 3,
        lng: 3,
      },
      {
        entityId: "h4",
        titleKo: "Hotel D",
        kind: "hotel",
        lat: 4,
        lng: 4,
      },
    ],
  });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.askUser, false);
    assert.equal(r.candidates.length, 3);
    assert.equal(r.candidates[0]!.pinRole, "anchor_candidate");
  }

  const pipeline = runSpatialRetrieval({
    text: "호텔 근처 맛집 찾아줘",
    workspaceId: "ws-osaka-trip",
    contextTitleKo: "Osaka Trip",
    candidates: [
      { entityId: "h1", titleKo: "Hotel A", kind: "hotel", lat: 1, lng: 1 },
      { entityId: "h2", titleKo: "Hotel B", kind: "hotel", lat: 2, lng: 2 },
      { entityId: "h3", titleKo: "Hotel C", kind: "hotel", lat: 3, lng: 3 },
    ],
    log: false,
  });
  assert.equal(pipeline.ok, false);
  if (!pipeline.ok) {
    assert.equal(pipeline.askUser, false);
    assert.equal(pipeline.anchorCandidates?.length, 3);
    assert.ok(!pipeline.reasonKo.includes("어느 호텔"));
  }
}

console.log("\n── Completion ──");
console.log("Intent 생성");
console.log(`anchorEntity = ${result.anchor.labelKo}`);
console.log("targetEntity = Restaurant");
console.log("relation = Nearby");
console.log("Spatial Query · radius/ranking/contextFit");
console.log("Reality Graph · Hotel ─Nearby─ Restaurants");
console.log("Projection Events · Map pins auto");
console.log("ambiguous → Projection (askUser=false)");

console.log(
  "\nok spatial-retrieval Query Engine · Reality Graph · Context Score · Projection",
);
