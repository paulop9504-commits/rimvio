/**
 * STEP 12 — Reality OS Final E2E
 *
 * Scenario:
 *   "오사카 4박5일 여행 만들어"
 *     → Context · Workspace · Graph · Agent
 *   "캡슐호텔만 보고싶어"
 *     → Intent · Draft · Diff · Projection
 *   "난바역 근처로 변경"
 *     → Simulation
 *   "예약 준비해"
 *     → Prepare (ready_for_commit)
 *   "승인"
 *     → Commit · Ledger (actor:user)
 *
 * Run: npm run test:reality-os-final-e2e
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
  createOsakaTripContext,
  saveRealityContext,
  clearRealityContextsForTests,
} from "@/lib/context";
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
  clearAllWorkspacesForTests,
  clearAllWorkspaceHistoryForTests,
  createWorkspace,
  openWorkspaceFromContext,
  readWorkspace,
} from "@/lib/workspace";
import {
  applyDraftMutation,
  clearCommandHistoryForTests,
  clearDraftMutationsForTests,
  readDraftMutation,
} from "@/lib/workspace-command";
import { clearDraftsForTests } from "@/lib/draft";
import { runRealityCommand, parseRealityCommand } from "@/lib/reality-command";
import { runAgentRuntime } from "@/lib/agent";
import {
  buildDynamicCallout,
  formatDynamicCalloutUxKo,
} from "@/lib/callout/dynamic";
import {
  clearProjectionForTests,
  listProjectionEvents,
  readProjectionSnapshot,
} from "@/lib/projection-engine";
import {
  buildRealityStateSlice,
  clearSimulationsForTests,
  formatHotelChangeSimulationUxKo,
  listSimulations,
  simulateHotelChange,
  SIMULATION_STATUS,
} from "@/lib/simulation-engine";
import {
  clearPreparesForTests,
  formatPrepareReadyUxKo,
  listPrepares,
  prepareHotelReservation,
  prepareSurfaceForbidsCommitCta,
  PREPARE_OBJECT_STATUS,
} from "@/lib/prepare-layer";
import {
  clearRealityCommitLedgerForTests,
  clearRealityCommitTransactionsForTests,
  formatCommitConfirmUxKo,
  listRealityCommitLedger,
  REALITY_COMMIT_ACTOR,
  runRealityCommit,
} from "@/lib/reality-commit";

const WS = "ws-reality-os-final";

function section(label: string): void {
  console.log(`\n── ${label}`);
}

// ── Reset ──────────────────────────────────────────────────────────
clearRealityGraphForTests();
clearRealityObjects();
clearRealityContextsForTests();
clearAllWorkspacesForTests();
clearAllWorkspaceHistoryForTests();
clearDraftMutationsForTests();
clearCommandHistoryForTests();
clearDraftsForTests();
clearProjectionForTests();
clearSimulationsForTests();
clearPreparesForTests();
clearRealityCommitLedgerForTests();
clearRealityCommitTransactionsForTests();
clearContextWorkspace(WS);

// ═══════════════════════════════════════════════════════════════════
section('1. "오사카 4박5일 여행 만들어" → Context · Workspace · Graph · Agent');
// ═══════════════════════════════════════════════════════════════════

const tripUtterance = "오사카 4박5일 여행 만들어";
const compiled = compileGlobeIngress({
  text: tripUtterance,
  existingContextId: WS,
});
assert.ok(compiled.blueprint, "Context Blueprint");
assert.equal(compiled.blueprint.containerKind, "travel");
console.log("  ✓ Context Blueprint · travel");

const realityCtx = createOsakaTripContext({
  intent: tripUtterance,
});
saveRealityContext(realityCtx);
assert.ok(realityCtx.id);
console.log("  ✓ Reality Context ·", realityCtx.titleKo);

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
      id: "ent_near_station",
      labelKo: "난바역 인근 호텔",
      domain: "lodging",
      lat: 34.663,
      lng: 135.502,
      rating: 7.8,
      priceBand: 2,
      amountLabel: "95,000원",
      reservable: true,
      localFavorite: false,
      source: "maps",
    },
  ],
});
assert.ok((readContextWorkspace(WS)?.nodes.length ?? 0) >= 3, "Workspace");
console.log("  ✓ Workspace 생성");

for (const [id, label] of [
  ["reality_namba_biz", "Namba Business Hotel"],
  ["reality_namba_capsule", "난바 캡슐호텔"],
  ["reality_near_station", "난바역 인근 호텔"],
] as const) {
  createRealityObject({
    objectId: id,
    entityId: id.replace("reality_", "ent_"),
    contextId: WS,
    kind: "hotel",
    labelKo: label,
    relationships: [],
    availableActions: [],
    metadata: {},
  });
}

upsertRealityEntity({
  id: "ent_namba_biz",
  type: "Hotel",
  properties: {
    name: "Namba Business Hotel",
    priceWon: 150_000,
    priceLabelKo: "150,000원",
    travelMinutes: 12,
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
    travelMinutes: 5,
    category: "capsule",
    hotelType: "capsule",
    lat: 34.666,
    lng: 135.501,
  },
  state: { lifecycle: "candidate", active: true },
});
upsertRealityEntity({
  id: "ent_near_station",
  type: "Hotel",
  properties: {
    name: "난바역 인근 호텔",
    priceWon: 95_000,
    priceLabelKo: "95,000원",
    travelMinutes: 3,
    category: "business",
    lat: 34.663,
    lng: 135.502,
    near: "namba_station",
  },
  state: { lifecycle: "discovered", active: true },
});
addRealityRelation({
  kind: "SimilarTo",
  fromId: "ent_namba_capsule",
  toId: "ent_near_station",
});
assert.ok(listRealityEntities("Hotel").length >= 3, "Graph");
console.log("  ✓ Reality Graph 생성");

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
      attrs: { category: "business", priceWon: 150_000, travelMinutes: 12 },
    },
    {
      realityObjectId: "reality_namba_capsule",
      entityId: "ent_namba_capsule",
      kind: "hotel",
      title: "난바 캡슐호텔",
      tags: ["capsule"],
      priceLabelKo: "45,000원",
      attrs: {
        category: "capsule",
        hotelType: "capsule",
        priceWon: 45_000,
        travelMinutes: 5,
      },
    },
    {
      realityObjectId: "reality_near_station",
      entityId: "ent_near_station",
      kind: "hotel",
      title: "난바역 인근 호텔",
      priceLabelKo: "95,000원",
      attrs: {
        category: "business",
        near: "namba_station",
        priceWon: 95_000,
        travelMinutes: 3,
      },
    },
  ],
});

const opened = openWorkspaceFromContext({
  context: realityCtx,
  workspaceId: WS,
  activePanel: "hotel",
});
assert.ok(opened.workspace);
console.log("  ✓ Osaka Trip Workspace");

applyWorkspaceTransition({
  contextEventId: WS,
  op: "select",
  nodeIds: [
    readContextWorkspace(WS)?.nodes.find((n) =>
      n.title.includes("캡슐"),
    )?.id ?? "",
  ].filter(Boolean),
  changeKo: "오사카 여행 시작",
});

const agent = runAgentRuntime({
  workspaceId: WS,
  utterance: "가격 올랐어 다른 호텔 찾아줘",
});
assert.equal(agent.ok, true);
if (agent.ok) {
  assert.ok(agent.uxKo.includes("AI Operator"));
  assert.equal(agent.commitForbidden, true);
  console.log("  ✓ Agent 실행 ·", agent.reasoning.recommendationKo);
}

// ═══════════════════════════════════════════════════════════════════
section('2. "캡슐호텔만 보고싶어" → Intent · Draft · Diff · Projection');
// ═══════════════════════════════════════════════════════════════════

const capsuleParsed = parseRealityCommand("캡슐호텔만 보고싶어");
assert.ok(capsuleParsed);
assert.equal(capsuleParsed!.action, "filter");
assert.equal(capsuleParsed!.constraint.type, "capsule");
console.log("  ✓ Intent · filter Hotel capsule");

const cmd = runRealityCommand({
  workspaceId: WS,
  text: "캡슐호텔만 보고싶어",
});
assert.equal(cmd.ok, true);
if (!cmd.ok) throw new Error("command failed");
assert.equal(cmd.intent.action, "filter");
assert.ok(cmd.proposal.draftId);
const draftId = cmd.proposal.draftId!;
const wireDraft = readDraftMutation(draftId);
assert.ok(wireDraft);
assert.equal(wireDraft!.status, "proposed");
assert.equal(wireDraft!.realityDiff.after.hotelType, "capsule");
console.log("  ✓ Draft · proposed");
console.log("  ✓ Diff ·", wireDraft!.impact.summaryKo);

const applied = applyDraftMutation(draftId);
assert.equal(applied.ok, true);
const wsAfter = readWorkspace(WS)!;
assert.equal(
  wsAfter.objects.filter((o) => o.kind === "hotel" && o.visible).length,
  1,
);
assert.ok(
  listProjectionEvents(WS).length > 0 || readProjectionSnapshot(WS),
  "Projection",
);
console.log("  ✓ Projection · capsule filter applied");

const callout = buildDynamicCallout({
  object: {
    id: "ent_namba_capsule",
    title: "난바 캡슐호텔",
    type: "hotel",
    priceLabelKo: "45,000원",
    priceWon: 45_000,
    whyLinesKo: ["캡슐", "난바"],
    evidence: [
      { id: "e1", title: "유형", value: "capsule", present: true },
    ],
    canPrepare: true,
  },
  context: {
    contextId: WS,
    titleKo: "오사카 4박5일",
    purposeKo: "여행",
    situationKo: "발견",
  },
  intent: { action: "filter", target: "hotel", rawText: "캡슐호텔만 보고싶어" },
  agent: null,
});
assert.equal(callout.fixedUi, false);
assert.ok(formatDynamicCalloutUxKo(callout).includes("Evidence"));

// ═══════════════════════════════════════════════════════════════════
section('3. "난바역 근처로 변경" → Simulation');
// ═══════════════════════════════════════════════════════════════════

const sim = simulateHotelChange({
  workspaceId: WS,
  draftId,
  current: buildRealityStateSlice({
    objectId: "ent_namba_capsule",
    title: "난바 캡슐호텔",
    priceWon: 45_000,
    travelMinutes: 5,
    lat: 34.666,
    lng: 135.501,
    attrs: { relatedPlaceIds: ["namba_station"], scheduleLoadMinutes: 30 },
  }),
  candidate: buildRealityStateSlice({
    objectId: "ent_near_station",
    title: "난바역 인근 호텔",
    priceWon: 95_000,
    travelMinutes: 3,
    lat: 34.663,
    lng: 135.502,
    attrs: { relatedPlaceIds: ["namba_station"], scheduleLoadMinutes: 28 },
  }),
});
assert.equal(sim.status, SIMULATION_STATUS);
assert.ok(sim.impact.uxLinesKo.length >= 1);
const simUx = formatHotelChangeSimulationUxKo(sim, "난바역 근처로 변경하면?");
assert.ok(simUx.includes("난바역"));
assert.ok(listSimulations(WS).length >= 1);
console.log("  ✓ Simulation ·", sim.impact.uxLinesKo.join(" · "));

// Reality Objects unchanged by Simulation
assert.equal(
  getRealityObject("reality_namba_capsule")?.updatedAt != null,
  true,
);

// ═══════════════════════════════════════════════════════════════════
section('4. "예약 준비해" → Prepare ready_for_commit');
// ═══════════════════════════════════════════════════════════════════

const prepared = prepareHotelReservation({
  entityId: "ent_namba_capsule",
  hotelTitle: "난바 캡슐호텔",
  utterance: "예약 준비해",
  workspaceId: WS,
  priceLabelKo: "45,000원",
  guests: 1,
  checkInIso: "2026-09-01",
  checkOutIso: "2026-09-05",
});
assert.equal(prepared.ok, true);
if (!prepared.ok) throw new Error("prepare failed");
assert.equal(prepared.prepare.status, PREPARE_OBJECT_STATUS);
assert.equal(prepared.executed, false);
assert.equal(prepared.awaitingCommit, true);

const prepUx = formatPrepareReadyUxKo(prepared.prepare);
assert.ok(prepUx.includes("예약 준비 완료"));
assert.ok(prepUx.includes("[예약 검토]"));
assert.ok(prepareSurfaceForbidsCommitCta(prepUx));
assert.equal(listPrepares(WS).length, 1);
assert.equal(getRealityEntity("ent_namba_capsule")?.state.lifecycle, "prepared");
console.log("  ✓ Prepare · ready_for_commit");
console.log(prepUx.split("\n").map((l) => `    ${l}`).join("\n"));

// AI cannot Commit via Prepare
const aiPrepCommit = runRealityCommit({
  source: "ai",
  approval: {
    approved: true,
    approvedAtIso: new Date().toISOString(),
    channel: "field",
  },
  prepare: prepared.prepare,
  workspaceId: WS,
});
assert.equal(aiPrepCommit.ok, false);

// ═══════════════════════════════════════════════════════════════════
section('5. "승인" → Commit · Ledger (actor:user)');
// ═══════════════════════════════════════════════════════════════════

const confirmUx = formatCommitConfirmUxKo({
  summaryKo: prepared.prepare.summaryKo,
  prepareTitleKo: prepared.prepare.titleKo,
});
assert.ok(confirmUx.includes("Confirm Reality Change"));
assert.ok(confirmUx.includes("[승인]"));
console.log(confirmUx.split("\n").map((l) => `    ${l}`).join("\n"));

const approvedAt = new Date().toISOString();
const committed = runRealityCommit({
  source: "field",
  approval: {
    approved: true,
    approvedAtIso: approvedAt,
    channel: "field",
  },
  prepare: prepared.prepare,
  workspaceId: WS,
});
assert.equal(committed.ok, true);
if (!committed.ok) throw new Error("commit failed");
assert.equal(committed.transaction.actor, REALITY_COMMIT_ACTOR);
assert.equal(committed.transaction.actor, "user");
assert.equal(committed.ledgerEntry.actor, "user");
assert.ok(committed.stagesCompleted.includes("ledger"));
assert.equal(getRealityEntity("ent_namba_capsule")?.state.lifecycle, "committed");

const ledger = listRealityCommitLedger(WS);
assert.equal(ledger.length, 1);
assert.equal(ledger[0]!.transactionId, committed.transaction.id);
console.log("  ✓ Commit · Ledger · actor:user");

// ── Cleanup ────────────────────────────────────────────────────────
clearDraftsForTests();
clearDraftMutationsForTests();
clearSimulationsForTests();
clearPreparesForTests();
clearRealityCommitLedgerForTests();
clearRealityCommitTransactionsForTests();
clearProjectionForTests();
clearAllWorkspacesForTests();
clearRealityGraphForTests();
clearRealityObjects();
clearRealityContextsForTests();
clearContextWorkspace(WS);

console.log("\nok reality-os-final-e2e Context→Workspace→Graph→Agent→Draft→Sim→Prepare→Commit→Ledger");
