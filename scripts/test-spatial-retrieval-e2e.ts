/**
 * Spatial Retrieval E2E
 *
 * 1. "오사카 여행 만들어" → Context 생성
 * 2. "난바 호텔 고정" → Anchor 생성
 * 3. "호텔 근처 맛집 찾아줘" → SPATIAL_DISCOVERY → Entities → Nearby → Pins → Callout
 * 4. "여기 일정에 넣어" → Draft Edge · Commit 전
 *
 * Pipeline:
 * NL → Intent → Context → Anchor → Spatial Retrieval → Reality Entity →
 * Relationship Graph → Workspace Projection → Dynamic Callout → Prepare → Commit
 */
import assert from "node:assert/strict";
import {
  applySpatialSessionTurn,
  createSpatialSession,
  formatContextAwareCalloutSketch,
  SPATIAL_DISCOVERY_TYPE,
} from "@/lib/spatial-retrieval";

console.log("\n── Spatial Retrieval E2E ──\n");

let state = createSpatialSession();
assert.equal(state.phase, "empty");

// —— 1. Context ——
{
  const turn = applySpatialSessionTurn(state, "오사카 여행 만들어");
  state = turn.state;
  assert.equal(turn.kind, "context_created");
  assert.equal(state.phase, "context_ready");
  assert.ok(state.context);
  assert.equal(state.context!.contextId, "osaka_trip");
  assert.ok(/Osaka/i.test(state.context!.titleKo));
  console.log(`1. Context 생성 · ${state.context!.titleKo} (${state.context!.contextId})`);
}

// —— 2. Anchor ——
{
  const turn = applySpatialSessionTurn(state, "난바 호텔 고정");
  state = turn.state;
  assert.equal(turn.kind, "anchor_fixed");
  assert.equal(state.phase, "anchor_ready");
  assert.ok(state.anchor);
  assert.equal(state.anchor!.labelKo, "Namba Hotel");
  assert.equal(state.anchor!.entityId, "hotel_123");
  console.log(`2. Anchor 생성 · ${state.anchor!.labelKo}`);
}

// —— 3. Spatial Discovery ——
{
  const turn = applySpatialSessionTurn(state, "호텔 근처 맛집 찾아줘");
  state = turn.state;
  assert.equal(turn.kind, "spatial_discovery");
  assert.equal(state.phase, "discovery_ready");
  assert.ok(state.lastRetrieval?.ok);
  if (!state.lastRetrieval || !state.lastRetrieval.ok) {
    throw new Error("retrieval failed");
  }

  const r = state.lastRetrieval;
  assert.equal(r.intent.type, SPATIAL_DISCOVERY_TYPE);
  assert.equal(r.intent.targetEntity, "restaurant");
  assert.equal(r.intent.relation, "nearby");

  // Restaurant Entity 생성
  assert.ok(r.entities.length >= 1);
  assert.ok(r.realityEntities.some((e) => e.type === "restaurant"));

  // Nearby Relationship 생성
  assert.ok(r.realityRelationships.length >= 1);
  assert.ok(r.realityRelationships.every((e) => e.type === "nearby"));
  assert.ok(r.realityRelationships.every((e) => e.from === r.anchor.entityId));

  // Map Pin 추가
  assert.ok(r.pins.some((p) => p.role === "anchor"));
  assert.ok(r.pins.filter((p) => p.role === "discovered").length >= 1);

  // Callout 표시 — Context Aware (not Restaurant Card)
  assert.ok(r.callouts.length >= 1);
  const callout = r.callouts[0]!;
  assert.equal(callout.mode, "discovery");
  assert.ok(callout.evidence.length >= 3);
  assert.ok(callout.evidence.some((e) => e.kind === "hotel_relation"));
  assert.ok(callout.evidence.some((e) => e.kind === "distance"));
  assert.ok(callout.evidence.some((e) => e.kind === "walking"));
  assert.ok(callout.evidence.some((e) => e.kind === "why" && e.checked));
  assert.ok(callout.relationships.length >= 1);
  assert.equal(callout.relationships[0]!.anchorTitleKo, "Namba Hotel");
  assert.deepEqual(
    callout.actions.map((a) => a.id),
    ["add_to_schedule", "compare", "prepare_reservation"],
  );
  assert.ok(callout.actions.some((a) => a.labelKo === "일정 추가"));
  assert.ok(callout.actions.some((a) => a.labelKo === "비교"));
  assert.ok(callout.actions.some((a) => a.labelKo === "예약 준비"));
  assert.ok(callout.whyLinesKo.every((w) => w.startsWith("✓")));

  console.log("3. SPATIAL_DISCOVERY → Entities → Nearby → Pins → Callout");
  console.log(formatContextAwareCalloutSketch(callout));
  console.log("");
}

// —— 4. Draft Edge (pre-Commit) ——
{
  const turn = applySpatialSessionTurn(state, "여기 일정에 넣어");
  state = turn.state;
  assert.equal(turn.kind, "draft_edge");
  assert.equal(state.phase, "draft_ready");
  assert.equal(state.draftEdges.length, 1);
  const draft = state.draftEdges[0]!;
  assert.equal(draft.kind, "schedule_add");
  assert.equal(draft.status, "draft");
  assert.equal(draft.committed, false);
  assert.equal(draft.fromEntityId, "hotel_123");
  assert.ok(draft.toEntityId);
  console.log(
    `4. Draft Edge 생성 · ${draft.id} · committed=${draft.committed} (Commit 전)`,
  );
}

// Pipeline stages present in logs
const joined = state.logs.join("\n");
assert.ok(joined.includes("Context 생성"));
assert.ok(joined.includes("Anchor 생성"));
assert.ok(joined.includes("Intent · SPATIAL_DISCOVERY"));
assert.ok(joined.includes("Restaurant Entity 생성"));
assert.ok(joined.includes("Nearby Relationship 생성"));
assert.ok(joined.includes("Map Pin 추가"));
assert.ok(joined.includes("Callout 표시"));
assert.ok(joined.includes("Draft Edge 생성"));
assert.ok(joined.includes("Commit 전 상태 유지"));

console.log("\n── Pipeline ──");
console.log(`User NL
  → Intent Understanding
  → Context Resolver
  → Anchor Resolver
  → Spatial Retrieval Engine
  → Reality Entity Builder
  → Relationship Graph Engine
  → Workspace Projection
  → Dynamic Callout UI
  → Prepare → User Commit`);

console.log("\nok spatial-retrieval E2E · Context → Anchor → Discovery → Callout → Draft");
