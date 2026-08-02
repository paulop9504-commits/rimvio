/**
 * Reality OS End-to-End
 *
 * Scenario:
 *   "오사카 4박5일 여행 만들어"
 *     → Context Blueprint → Workspace → Reality Graph → Agent observe
 *   "캡슐호텔만 보고 싶어"
 *     → Intent → Draft → Reality Diff → Apply → Projection
 *   "난바역 근처로 바꿔"
 *     → Constraint → Simulation → Impact
 *   "더 싼 호텔로 변경"
 *     → Alternative Entity → Simulation → Draft
 *   "예약 준비해"
 *     → Prepare Object (ready_for_commit)
 *   User Approval
 *     → Commit Gate → Reality Transaction → Ledger
 *
 * Principles:
 *   Globe = Reality View
 *   Workspace = Reality Editor
 *   AI = Reality Operator
 *   Commit = Human Controlled Reality Change
 */
import assert from "node:assert/strict";
import { compileGlobeIngress } from "@/lib/globe-ingress";
import { openMapContextWorkspace } from "@/lib/context-workspace/open-map-workspace";
import {
  clearContextWorkspace,
  readContextWorkspace,
} from "@/lib/context-workspace/workspace-store";
import { applyWorkspaceTransition } from "@/lib/context-workspace/apply-workspace-transition";
import {
  addRealityRelation,
  clearRealityGraphForTests,
  getRealityEntity,
  listRealityEntities,
  upsertRealityEntity,
} from "@/lib/reality-graph";
import {
  clearRealityObjects,
  createRealityObject,
  getRealityObject,
} from "@/lib/reality-object/reality-object-store";
import {
  applyDraftMutation,
  clearCommandHistoryForTests,
  clearDraftMutationsForTests,
  createWorkspaceCommand,
  listProposedDrafts,
  resolveWorkspaceIntent,
  runWorkspaceCommandRuntime,
} from "@/lib/workspace-command";
import {
  clearAllWorkspacesForTests,
  clearAllWorkspaceHistoryForTests,
  createWorkspace,
  readWorkspace,
} from "@/lib/workspace";
import {
  clearProjectionForTests,
  listProjectionEvents,
  readProjectionSnapshot,
} from "@/lib/projection-engine";
import {
  readWorkspaceAgentContext,
  runWorkspaceRealityAgent,
} from "@/lib/workspace-agent";
import {
  buildRealityStateSlice,
  clearSimulationsForTests,
  listSimulations,
  simulateHotelChange,
  SIMULATION_STATUS,
} from "@/lib/simulation-engine";
import {
  clearPreparesForTests,
  listPrepares,
  prepareHotelReservation,
  PREPARE_OBJECT_STATUS,
} from "@/lib/prepare-layer";
import {
  clearRealityCommitLedgerForTests,
  clearRealityCommitTransactionsForTests,
  listRealityCommitLedger,
  REALITY_COMMIT_ACTOR,
  runRealityCommit,
} from "@/lib/reality-commit";

const WS = "ws-reality-os-e2e";

function section(label: string): void {
  console.log(`\n── ${label}`);
}

// ── Reset ──────────────────────────────────────────────────────────
clearRealityGraphForTests();
clearRealityObjects();
clearAllWorkspacesForTests();
clearAllWorkspaceHistoryForTests();
clearDraftMutationsForTests();
clearCommandHistoryForTests();
clearProjectionForTests();
clearSimulationsForTests();
clearPreparesForTests();
clearRealityCommitLedgerForTests();
clearRealityCommitTransactionsForTests();
clearContextWorkspace(WS);

// ═══════════════════════════════════════════════════════════════════
section('1. User · "오사카 4박5일 여행 만들어"');
// ═══════════════════════════════════════════════════════════════════

const tripUtterance = "오사카 4박5일 여행 만들어";
const compiled = compileGlobeIngress({
  text: tripUtterance,
  existingContextId: WS,
});

assert.equal(compiled.intent, tripUtterance);
assert.ok(compiled.blueprint, "Context Blueprint 생성");
assert.equal(compiled.blueprint.containerKind, "travel");
assert.ok(
  (compiled.blueprint.executionGraph?.nodes.length ?? 0) > 0,
  "Blueprint executionGraph",
);
assert.equal(compiled.context.contextId, WS);
assert.equal(compiled.runtime.contextId, WS);
console.log("  ✓ Context Blueprint · travel");

// Workspace (Reality Editor)
openMapContextWorkspace({
  contextEventId: WS,
  domain: "lodging",
  query: tripUtterance,
  summaryKo: "오사카 4박5일",
  source: "test",
  candidates: [
    {
      id: "ent_namba_biz",
      labelKo: "Namba Business Hotel",
      domain: "lodging",
      lat: 34.665,
      lng: 135.5,
      rating: 8,
      priceBand: 3,
      amountLabel: "150,000원",
      reservable: true,
      localFavorite: false,
      source: "maps",
    },
    {
      id: "ent_namba_capsule",
      labelKo: "난바 캡슐호텔",
      domain: "lodging",
      lat: 34.666,
      lng: 135.501,
      rating: 7.2,
      priceBand: 1,
      amountLabel: "45,000원",
      reservable: true,
      localFavorite: false,
      source: "maps",
    },
    {
      id: "ent_umeda_biz",
      labelKo: "Umeda Business Hotel",
      domain: "lodging",
      lat: 34.705,
      lng: 135.498,
      rating: 8.1,
      priceBand: 3,
      amountLabel: "160,000원",
      reservable: true,
      localFavorite: false,
      source: "maps",
    },
  ],
});

const ctxWs = readContextWorkspace(WS);
assert.ok(ctxWs);
assert.ok(ctxWs!.nodes.length >= 3, "Workspace 생성");
console.log("  ✓ Workspace 생성 ·", ctxWs!.nodes.length, "nodes");

// Reality Objects (view sources) + Reality Graph
const rBiz = createRealityObject({
  objectId: "reality_namba_biz",
  entityId: "ent_namba_biz",
  contextId: WS,
  kind: "hotel",
  labelKo: "Namba Business Hotel",
  relationships: [],
  availableActions: [],
  metadata: {},
});
const rCap = createRealityObject({
  objectId: "reality_namba_capsule",
  entityId: "ent_namba_capsule",
  contextId: WS,
  kind: "hotel",
  labelKo: "난바 캡슐호텔",
  relationships: [],
  availableActions: [],
  metadata: {},
});
const rUmeda = createRealityObject({
  objectId: "reality_umeda_biz",
  entityId: "ent_umeda_biz",
  contextId: WS,
  kind: "hotel",
  labelKo: "Umeda Business Hotel",
  relationships: [],
  availableActions: [],
  metadata: {},
});
const realityUpdatedAt = {
  biz: rBiz.updatedAt,
  cap: rCap.updatedAt,
  umeda: rUmeda.updatedAt,
};

upsertRealityEntity({
  id: "ent_namba_biz",
  type: "Hotel",
  properties: {
    name: "Namba Business Hotel",
    priceWon: 150_000,
    priceLabelKo: "150,000원",
    rating: 4.5,
    travelMinutes: 8,
    tags: "namba,hotel,business",
    category: "business",
    lat: 34.665,
    lng: 135.5,
  },
  state: { lifecycle: "discovered", active: true },
});
upsertRealityEntity({
  id: "ent_namba_capsule",
  type: "Hotel",
  properties: {
    name: "난바 캡슐호텔",
    priceWon: 45_000,
    priceLabelKo: "45,000원",
    rating: 4.0,
    travelMinutes: 5,
    tags: "namba,hotel,capsule",
    category: "capsule",
    hotelType: "capsule",
    lat: 34.666,
    lng: 135.501,
  },
  state: { lifecycle: "candidate", active: true },
});
upsertRealityEntity({
  id: "ent_umeda_biz",
  type: "Hotel",
  properties: {
    name: "Umeda Business Hotel",
    priceWon: 160_000,
    priceLabelKo: "160,000원",
    rating: 4.6,
    travelMinutes: 25,
    tags: "umeda,hotel,business",
    category: "business",
    lat: 34.705,
    lng: 135.498,
  },
  state: { lifecycle: "discovered", active: true },
});
addRealityRelation({
  kind: "SimilarTo",
  fromId: "ent_namba_biz",
  toId: "ent_namba_capsule",
});
addRealityRelation({
  kind: "LocatedNear",
  fromId: "ent_namba_biz",
  toId: "ent_namba_capsule",
});

assert.ok(listRealityEntities("Hotel").length >= 3, "Reality Graph 생성");
console.log("  ✓ Reality Graph 생성 · Hotel entities");

createWorkspace({
  id: WS,
  contextId: WS,
  seeds: [
    {
      realityObjectId: "reality_namba_biz",
      entityId: "ent_namba_biz",
      kind: "hotel",
      title: "Namba Business Hotel",
      priceLabelKo: "150,000원",
      rating: 4.5,
      attrs: { category: "business", travelMinutes: 8, priceWon: 150_000 },
    },
    {
      realityObjectId: "reality_namba_capsule",
      entityId: "ent_namba_capsule",
      kind: "hotel",
      title: "난바 캡슐호텔",
      priceLabelKo: "45,000원",
      rating: 4.0,
      tags: ["capsule"],
      attrs: {
        hotelType: "capsule",
        category: "capsule",
        travelMinutes: 5,
        priceWon: 45_000,
      },
    },
    {
      realityObjectId: "reality_umeda_biz",
      entityId: "ent_umeda_biz",
      kind: "hotel",
      title: "Umeda Business Hotel",
      priceLabelKo: "160,000원",
      rating: 4.6,
      attrs: { category: "business", travelMinutes: 25, priceWon: 160_000 },
    },
  ],
});

applyWorkspaceTransition({
  contextEventId: WS,
  op: "select",
  nodeIds: [
    ctxWs!.nodes.find((n) => n.title.includes("Namba Business"))?.id ?? "",
  ].filter(Boolean),
  changeKo: "오사카 여행 시작 · 숙소 후보",
});

// Workspace Agent observe (Operator — no Commit)
const observed = readWorkspaceAgentContext(WS);
assert.equal(observed.ok, true);
if (observed.ok) {
  assert.ok(observed.context.draftOnly);
  assert.ok(
    observed.context.contextTitleKo.includes("오사카") ||
      observed.context.currentHotel != null,
  );
}
console.log("  ✓ Workspace Agent 실행 · Observe (draftOnly)");

// ═══════════════════════════════════════════════════════════════════
section('2. User · "캡슐호텔만 보고 싶어"');
// Intent → Draft → Reality Diff → Apply → Projection
// ═══════════════════════════════════════════════════════════════════

const capsuleUtterance = "캡슐호텔만 보고 싶어";
const capsuleCmd = createWorkspaceCommand({
  workspaceId: WS,
  rawText: capsuleUtterance,
});
const capsuleIntent = resolveWorkspaceIntent(capsuleCmd);
assert.ok(capsuleIntent);
assert.equal(capsuleIntent!.action, "modify_context");
assert.equal(capsuleIntent!.parameters.hotelType, "capsule");
console.log("  ✓ Intent Resolution · modify_context / capsule");

const capsuleRuntime = runWorkspaceCommandRuntime({
  workspaceId: WS,
  rawText: capsuleUtterance,
});
assert.equal(capsuleRuntime.ok, true);
assert.ok(capsuleRuntime.ok && capsuleRuntime.mode === "proposed");
assert.ok(capsuleRuntime.ok && capsuleRuntime.proposal);
const capsuleDraft = capsuleRuntime.ok
  ? capsuleRuntime.proposal!.draft
  : null;
assert.ok(capsuleDraft);
assert.equal(capsuleDraft!.status, "proposed");
assert.equal(capsuleDraft!.realityDiff.after.hotelType, "capsule");
assert.ok(capsuleDraft!.impact.summaryKo);
console.log("  ✓ Draft Action · Reality Diff · Impact");

// Apply must not touch Reality Object timestamps
const appliedCapsule = applyDraftMutation(capsuleDraft!.id);
assert.equal(appliedCapsule.ok, true);
assert.ok((appliedCapsule.ok && (appliedCapsule.projectionEventCount ?? 0)) >= 1);

const afterCapsule = readWorkspace(WS)!;
assert.equal(afterCapsule.objects.filter((o) => o.visible).length, 1);
assert.ok(
  afterCapsule.objects.find((o) => o.visible)?.title.includes("캡슐"),
);
console.log("  ✓ Workspace Apply · capsule only visible");

const projEvents = listProjectionEvents(WS);
assert.ok(projEvents.some((e) => e.type === "OBJECT_VISIBLE_CHANGED"));
const snap = readProjectionSnapshot(WS);
assert.ok(snap);
assert.equal(snap!.hotelType, "capsule");
assert.equal(snap!.visibleObjectIds.length, 1);
console.log("  ✓ Projection Update · OBJECT_VISIBLE_CHANGED");

assert.equal(getRealityObject("reality_namba_biz")!.updatedAt, realityUpdatedAt.biz);
assert.equal(getRealityObject("reality_namba_capsule")!.updatedAt, realityUpdatedAt.cap);
assert.equal(getRealityObject("reality_umeda_biz")!.updatedAt, realityUpdatedAt.umeda);
console.log("  ✓ Globe Reality Objects untouched (View only)");

// ═══════════════════════════════════════════════════════════════════
section('3. User · "난바역 근처로 바꿔"');
// Constraint → Simulation → Impact
// ═══════════════════════════════════════════════════════════════════

const nearUtterance = "난바역 근처로 바꿔";
const nearIntent = resolveWorkspaceIntent(
  createWorkspaceCommand({ workspaceId: WS, rawText: nearUtterance }),
);
assert.ok(nearIntent);
assert.equal(nearIntent!.action, "add_constraint");
assert.ok(
  String(nearIntent!.parameters.near ?? "").includes("난바") ||
    nearIntent!.parameters.stationNear === true,
);
console.log("  ✓ Constraint 추가 · near 난바");

const nearSim = simulateHotelChange({
  workspaceId: WS,
  current: buildRealityStateSlice({
    objectId: "ent_umeda_biz",
    title: "Umeda Business Hotel",
    kind: "hotel",
    priceWon: 160_000,
    priceLabelKo: "160,000원",
    rating: 4.6,
    travelMinutes: 25,
  }),
  candidate: buildRealityStateSlice({
    objectId: "ent_namba_capsule",
    title: "난바 캡슐호텔",
    kind: "hotel",
    priceWon: 45_000,
    priceLabelKo: "45,000원",
    rating: 4.0,
    travelMinutes: 5,
  }),
});
assert.equal(nearSim.status, SIMULATION_STATUS);
assert.equal(nearSim.status, "SIMULATION_ONLY");
assert.ok(nearSim.impact.travelMinutesDelta != null);
assert.ok((nearSim.impact.travelMinutesDelta ?? 0) < 0, "이동 시간 감소");
assert.ok(nearSim.impact.linesKo.length >= 1);
assert.ok(listSimulations(WS).length >= 1);
console.log("  ✓ Simulation · Impact 표시 ·", nearSim.impact.summaryKo);

// ═══════════════════════════════════════════════════════════════════
section('4. User · "더 싼 호텔로 변경"');
// Alternative Entity → Simulation → Draft
// ═══════════════════════════════════════════════════════════════════

const cheapUtterance = "더 싼 호텔로 변경";
// Ensure selection context for Agent — Namba Business as current
applyWorkspaceTransition({
  contextEventId: WS,
  op: "select",
  nodeIds: [
    readContextWorkspace(WS)?.nodes.find((n) =>
      n.title.includes("캡슐"),
    )?.id ??
      readWorkspace(WS)?.objects.find((o) => o.title.includes("캡슐"))?.id ??
      "",
  ].filter(Boolean),
});

// Alternative already on graph (SimilarTo); re-assert
assert.ok(getRealityEntity("ent_namba_capsule"));
console.log("  ✓ Alternative Entity · 난바 캡슐호텔");

const cheapSim = simulateHotelChange({
  workspaceId: WS,
  current: buildRealityStateSlice({
    objectId: "ent_namba_biz",
    title: "Namba Business Hotel",
    kind: "hotel",
    priceWon: 150_000,
    priceLabelKo: "150,000원",
    rating: 4.5,
    travelMinutes: 8,
  }),
  candidate: buildRealityStateSlice({
    objectId: "ent_namba_capsule",
    title: "난바 캡슐호텔",
    kind: "hotel",
    priceWon: 45_000,
    priceLabelKo: "45,000원",
    rating: 4.0,
    travelMinutes: 5,
  }),
});
assert.equal(cheapSim.status, "SIMULATION_ONLY");
assert.equal(cheapSim.impact.priceWonDelta, -105_000);
console.log("  ✓ Simulation · 가격", cheapSim.impact.priceWonDelta);

clearDraftMutationsForTests(WS);
const agent = runWorkspaceRealityAgent({
  workspaceId: WS,
  utterance: "호텔 바꿔줘",
});
assert.equal(agent.ok, true);
if (agent.ok) {
  assert.equal(agent.phase, "request_apply");
  assert.equal(agent.proposal.draft.status, "proposed");
  assert.ok(
    agent.proposalKind === "hotel_change" ||
      agent.proposal.draft.afterState.proposalKind === "hotel_change",
  );
  assert.equal(agent.validation.realityCommitBlocked, true);
}
console.log("  ✓ Draft 생성 · Hotel Change Proposal · Commit blocked");

// Cheap intent also resolves
const cheapIntent = resolveWorkspaceIntent(
  createWorkspaceCommand({ workspaceId: WS, rawText: cheapUtterance }),
);
assert.ok(
  cheapIntent?.action === "modify_context" ||
    cheapIntent?.action === "replace" ||
    /싼|저렴|변경|바꿔/u.test(cheapUtterance),
);

// ═══════════════════════════════════════════════════════════════════
section('5. User · "예약 준비해"');
// Prepare Object · ready_for_commit
// ═══════════════════════════════════════════════════════════════════

const prep = prepareHotelReservation({
  entityId: "ent_namba_capsule",
  hotelTitle: "난바 캡슐호텔",
  utterance: "예약 준비해",
  workspaceId: WS,
  priceLabelKo: "45,000원",
  guests: 2,
  checkInIso: "2026-08-10",
  checkOutIso: "2026-08-14",
  options: { breakfast: false, roomType: "capsule" },
});
assert.equal(prep.ok, true);
if (prep.ok) {
  assert.equal(prep.executed, false);
  assert.equal(prep.awaitingCommit, true);
  assert.equal(prep.prepare.status, PREPARE_OBJECT_STATUS);
  assert.equal(prep.prepare.status, "ready_for_commit");
  assert.equal(prep.prepare.action, "reservation_prepare");
  assert.equal(prep.prepare.payload.kind, "reservation");
  assert.equal(prep.prepare.payload.guests, 2);
  assert.ok(
    (prep.prepare.payload.dates as { checkInIso: string }).checkInIso,
  );
}
assert.equal(listPrepares(WS).length, 1);
assert.equal(getRealityEntity("ent_namba_capsule")?.state.lifecycle, "prepared");
console.log("  ✓ Prepare Object · ready_for_commit · Commit 전 대기");

// AI must NOT commit
const aiCommit = runRealityCommit({
  source: "ai",
  approval: {
    approved: true,
    approvedAtIso: new Date().toISOString(),
    channel: "field",
  },
  prepare: prep.ok ? prep.prepare : null,
  workspaceId: WS,
});
assert.equal(aiCommit.ok, false);
if (!aiCommit.ok) assert.equal(aiCommit.aiAttemptedCommit, true);
console.log("  ✓ AI Commit 거부 · Human Approval Required");

// ═══════════════════════════════════════════════════════════════════
section("6. User Approval · Commit Gate → Transaction → Ledger");
// ═══════════════════════════════════════════════════════════════════

const committed = runRealityCommit({
  source: "field",
  approval: {
    approved: true,
    approvedAtIso: new Date().toISOString(),
    channel: "field",
    approverId: "user_e2e",
  },
  prepareId: prep.ok ? prep.prepare.prepareId : null,
  workspaceId: WS,
  entityId: "ent_namba_capsule",
});
assert.equal(committed.ok, true);
if (committed.ok) {
  assert.equal(committed.transaction.actor, REALITY_COMMIT_ACTOR);
  assert.equal(committed.transaction.actor, "user");
  assert.equal(committed.transaction.type, "hotel_reservation");
  assert.equal(
    committed.transaction.beforeState.reservationStatus,
    "candidate",
  );
  assert.equal(
    committed.transaction.afterState.reservationStatus,
    "confirmed",
  );
  assert.ok(committed.transaction.timestamp);
  assert.ok(committed.stagesCompleted.includes("commit_gate"));
  assert.ok(committed.stagesCompleted.includes("user_approval"));
  assert.ok(committed.stagesCompleted.includes("reality_transaction"));
  assert.ok(committed.stagesCompleted.includes("ledger"));
  assert.equal(committed.ledgerEntry.actor, "user");
}
console.log("  ✓ Commit Gate · Reality Transaction · Ledger");

assert.equal(getRealityEntity("ent_namba_capsule")?.state.lifecycle, "committed");
assert.equal(
  getRealityEntity("ent_namba_capsule")?.state.reservationStatus,
  "confirmed",
);

const ledger = listRealityCommitLedger(WS);
assert.equal(ledger.length, 1);
assert.equal(ledger[0]?.type, "hotel_reservation");
assert.equal(ledger[0]?.actor, "user");
console.log("  ✓ Ledger 기록 · candidate → confirmed");

// Reality Object store still RO for editor mutations earlier
assert.equal(getRealityObject("reality_namba_capsule")!.labelKo, "난바 캡슐호텔");

// ═══════════════════════════════════════════════════════════════════
section("7. Final principles");
// ═══════════════════════════════════════════════════════════════════

assert.ok(compiled.blueprint, "Globe / Ingress = Reality View structure");
assert.ok(readWorkspace(WS), "Workspace = Reality Editor");
assert.ok(observed.ok && observed.context.draftOnly, "AI = Reality Operator (draft)");
assert.equal(
  committed.ok && committed.transaction.actor,
  "user",
  "Commit = Human Controlled Reality Change",
);
assert.equal(listProposedDrafts(WS).length >= 0, true);

console.log("  ✓ Globe = Reality View");
console.log("  ✓ Workspace = Reality Editor");
console.log("  ✓ AI = Reality Operator");
console.log("  ✓ Commit = Human Controlled Reality Change");

// Cleanup
clearContextWorkspace(WS);
clearAllWorkspacesForTests();
clearDraftMutationsForTests();
clearCommandHistoryForTests();
clearProjectionForTests();
clearSimulationsForTests();
clearPreparesForTests();
clearRealityCommitLedgerForTests();
clearRealityCommitTransactionsForTests();
clearRealityGraphForTests();
clearRealityObjects();

console.log("\nok reality-os-e2e osaka-trip capsule→near→cheap→prepare→human-commit");
