/**
 * Reality OS E2E — Test 2 · Travel Change Agent (Day1 fatigue)
 * Test 3 · Multi Object Reasoning (hotel → Umeda ripple)
 * Test 4 · Real World Commit (예약해 → Prepare → Human → Ledger)
 *
 * Focus: one Context, AI keeps working — not one-shot search.
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
  clearRealityGraphForTests,
  getRealityEntity,
  upsertRealityEntity,
} from "@/lib/reality-graph";
import {
  applyDraftMutation,
  clearCommandHistoryForTests,
  clearDraftMutationsForTests,
  formatRealityDiffGitStyleKo,
  runWorkspaceCommandRuntime,
} from "@/lib/workspace-command";
import {
  clearAllWorkspacesForTests,
  clearAllWorkspaceHistoryForTests,
  createWorkspace,
} from "@/lib/workspace";
import { clearProjectionForTests } from "@/lib/projection-engine";
import {
  clearSimulationsForTests,
  buildRealityStateSlice,
  simulateHotelMoveWithRipple,
} from "@/lib/simulation-engine";
import {
  clearPreparesForTests,
  runRealityPrepare,
} from "@/lib/prepare-layer";
import {
  clearRealityCommitLedgerForTests,
  clearRealityCommitTransactionsForTests,
  listRealityCommitLedger,
  runRealityCommit,
} from "@/lib/reality-commit";
import {
  runWorkspaceRealityAgent,
  looksLikeScheduleFatigue,
} from "@/lib/workspace-agent";

const WS = "ws-reality-os-e2e-next";

function reset(): void {
  clearRealityGraphForTests();
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
}

function seedTrip(): void {
  compileGlobeIngress({
    text: "혼자 가는 오사카 4박5일인데 맛집보다 쇼핑 중심으로 만들어",
    existingContextId: WS,
  });

  openMapContextWorkspace({
    contextEventId: WS,
    domain: "lodging",
    query: "오사카 쇼핑 여행",
    summaryKo: "오사카 4박5일 · 쇼핑",
    source: "test",
    candidates: [
      {
        id: "ent_namba",
        labelKo: "Namba Hotel",
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
        id: "ent_umeda",
        labelKo: "Umeda Hotel",
        domain: "lodging",
        lat: 34.705,
        lng: 135.498,
        rating: 8.2,
        priceBand: 3,
        amountLabel: "155,000원",
        reservable: true,
        localFavorite: false,
        source: "maps",
      },
      {
        id: "ent_cap",
        labelKo: "난바 캡슐호텔",
        domain: "lodging",
        lat: 34.666,
        lng: 135.501,
        rating: 7,
        priceBand: 1,
        amountLabel: "42,000원",
        reservable: true,
        localFavorite: false,
        source: "maps",
      },
    ],
  });

  upsertRealityEntity({
    id: "ent_namba",
    type: "Hotel",
    properties: {
      name: "Namba Hotel",
      priceWon: 150_000,
      priceLabelKo: "150,000원",
      travelMinutes: 10,
      foodAccessMinutes: 8,
      usjMinutes: 35,
      airportMinutes: 55,
      lat: 34.665,
      lng: 135.5,
    },
    state: { lifecycle: "candidate", active: true },
  });
  upsertRealityEntity({
    id: "ent_umeda",
    type: "Hotel",
    properties: {
      name: "Umeda Hotel",
      priceWon: 155_000,
      priceLabelKo: "155,000원",
      travelMinutes: 18,
      foodAccessMinutes: 12,
      usjMinutes: 55,
      airportMinutes: 40,
      lat: 34.705,
      lng: 135.498,
    },
    state: { lifecycle: "discovered", active: true },
  });
  upsertRealityEntity({
    id: "ent_cap",
    type: "Hotel",
    properties: {
      name: "난바 캡슐호텔",
      priceWon: 42_000,
      priceLabelKo: "42,000원",
      hotelType: "capsule",
      category: "capsule",
      tags: "capsule,namba",
    },
    state: { lifecycle: "candidate", active: true },
  });

  createWorkspace({
    id: WS,
    contextId: WS,
    seeds: [
      {
        realityObjectId: "ent_namba",
        entityId: "ent_namba",
        kind: "hotel",
        title: "Namba Hotel",
        priceLabelKo: "150,000원",
        attrs: { priceWon: 150_000, category: "business" },
      },
      {
        realityObjectId: "ent_umeda",
        entityId: "ent_umeda",
        kind: "hotel",
        title: "Umeda Hotel",
        priceLabelKo: "155,000원",
        attrs: { priceWon: 155_000, category: "business" },
      },
      {
        realityObjectId: "ent_cap",
        entityId: "ent_cap",
        kind: "hotel",
        title: "난바 캡슐호텔",
        priceLabelKo: "42,000원",
        tags: ["capsule"],
        attrs: { priceWon: 42_000, hotelType: "capsule", category: "capsule" },
      },
    ],
  });

  applyWorkspaceTransition({
    contextEventId: WS,
    op: "select",
    nodeIds: [
      readContextWorkspace(WS)?.nodes.find((n) => n.title.includes("Namba"))
        ?.id ?? "",
    ].filter(Boolean),
  });
}

// ─── Blueprint intelligence ────────────────────────────────────────
reset();
{
  console.log("\n── Blueprint intelligence · shopping_trip / solo");
  const compiled = compileGlobeIngress({
    text: "혼자 가는 오사카 4박5일인데 맛집보다 쇼핑 중심으로 만들어",
    existingContextId: `${WS}-bp`,
  });
  const known = compiled.blueprint.resourcePlan.knownTruth;
  const purpose = known.find((k) => k.slotId === "purpose")?.value;
  const traveler = known.find((k) => k.slotId === "traveler")?.value;
  const priority = known.find((k) => k.slotId === "priority")?.value as
    | string[]
    | undefined;
  assert.equal(purpose, "shopping_trip");
  assert.equal(traveler, "solo");
  assert.ok(priority && priority[0] === "shopping");
  assert.ok(priority && priority.indexOf("shopping") < priority.indexOf("food"));
  assert.equal(compiled.blueprint.constraints.companionMode, "solo");
  console.log("  ✓ purpose shopping_trip · traveler solo · shopping > food");
}

// ─── Diff Git-style ────────────────────────────────────────────────
reset();
{
  console.log("\n── Reality Diff · capsule filter counts");
  const candidates = [
    {
      id: "ent_namba",
      labelKo: "Namba Hotel",
      domain: "lodging" as const,
      lat: 34.665,
      lng: 135.5,
      rating: 8,
      priceBand: 3,
      amountLabel: "150,000원",
      reservable: true,
      localFavorite: false,
      source: "maps" as const,
    },
    {
      id: "ent_cap",
      labelKo: "난바 캡슐호텔",
      domain: "lodging" as const,
      lat: 34.666,
      lng: 135.501,
      rating: 7,
      priceBand: 1,
      amountLabel: "42,000원",
      reservable: true,
      localFavorite: false,
      source: "maps" as const,
    },
  ];
  for (let i = 0; i < 8; i++) {
    candidates.push({
      id: `ent_fill_${i}`,
      labelKo: `Business ${i}`,
      domain: "lodging",
      lat: 34.66 + i * 0.001,
      lng: 135.5,
      rating: 7,
      priceBand: 3,
      amountLabel: `${120_000 + i * 1000}원`,
      reservable: true,
      localFavorite: false,
      source: "maps",
    });
  }
  openMapContextWorkspace({
    contextEventId: WS,
    domain: "lodging",
    query: "오사카",
    summaryKo: "오사카",
    source: "test",
    candidates,
  });
  createWorkspace({
    id: WS,
    contextId: WS,
    seeds: candidates.map((c) => ({
      realityObjectId: c.id,
      entityId: c.id,
      kind: "hotel" as const,
      title: c.labelKo,
      priceLabelKo: c.amountLabel,
      tags: c.id === "ent_cap" ? ["capsule"] : [],
      attrs: {
        priceWon: Number(String(c.amountLabel).replace(/[^\d]/g, "")) || null,
        category: c.id === "ent_cap" ? "capsule" : "business",
        hotelType: c.id === "ent_cap" ? "capsule" : "business",
      },
    })),
  });

  const runtime = runWorkspaceCommandRuntime({
    workspaceId: WS,
    rawText: "캡슐호텔만 보고 싶어",
  });
  assert.ok(runtime.ok && runtime.proposal);
  const diff = runtime.ok ? runtime.proposal!.draft.realityDiff : null;
  assert.ok(diff);
  assert.ok(Number(diff!.before.visibleHotels) >= 8);
  assert.equal(Number(diff!.after.visibleHotels), 1);
  assert.ok(Number(diff!.impact.details.candidatesRemoved) >= 7);
  const git = formatRealityDiffGitStyleKo(diff!);
  assert.ok(/Before:/u.test(git));
  assert.ok(/After:/u.test(git));
  assert.ok(/Impact:/u.test(git));
  assert.ok(/candidates/u.test(git));
  console.log(git.split("\n").map((l) => `  ${l}`).join("\n"));

  const applied = applyDraftMutation(runtime.ok ? runtime.proposal!.draft.id : "");
  assert.equal(applied.ok, true);
}

// ─── Test 2 · Fatigue Agent ────────────────────────────────────────
reset();
seedTrip();
{
  console.log('\n── Test 2 · "첫날 너무 피곤할 것 같아"');
  assert.equal(looksLikeScheduleFatigue("첫날 너무 피곤할 것 같아"), true);

  const agent = runWorkspaceRealityAgent({
    workspaceId: WS,
    utterance: "첫날 너무 피곤할 것 같아",
  });
  assert.equal(agent.ok, true);
  if (agent.ok) {
    assert.equal(agent.intent.action, "optimize_context");
    assert.equal(agent.intent.parameters.problem, "day1_fatigue");
    assert.ok(agent.plan.steps.some((s) => s.kind === "observe_schedule"));
    assert.ok(agent.plan.steps.some((s) => s.kind === "analyze_fatigue"));
    assert.ok(agent.plan.steps.some((s) => s.kind === "alternative_plan"));
    assert.ok(agent.plan.steps.some((s) => s.kind === "create_draft"));
    assert.equal(agent.proposal.draft.status, "proposed");
    assert.equal(agent.proposal.draft.afterState.proposalKind, "schedule_soften");
    assert.equal(agent.proposal.draft.afterState.problem, "피로도 높음");
    assert.ok(agent.simulation);
    assert.equal(agent.simulation!.status, "SIMULATION_ONLY");
    assert.ok(agent.validation.realityCommitBlocked);
    console.log("  ✓ Observe → Fatigue → Alt Plan → Simulation → Draft");
  }
}

// ─── Test 3 · Multi-object ripple ──────────────────────────────────
reset();
seedTrip();
{
  console.log('\n── Test 3 · "호텔을 우메다로 옮겨줘"');
  const sim = simulateHotelMoveWithRipple({
    workspaceId: WS,
    current: buildRealityStateSlice({
      objectId: "ent_namba",
      title: "Namba Hotel",
      priceWon: 150_000,
      priceLabelKo: "150,000원",
      travelMinutes: 10,
      lat: 34.665,
      lng: 135.5,
      attrs: {
        foodAccessMinutes: 8,
        usjMinutes: 35,
        airportMinutes: 55,
      },
    }),
    destination: buildRealityStateSlice({
      objectId: "ent_umeda",
      title: "Umeda Hotel",
      priceWon: 155_000,
      priceLabelKo: "155,000원",
      travelMinutes: 18,
      lat: 34.705,
      lng: 135.498,
      attrs: {
        foodAccessMinutes: 12,
        usjMinutes: 55,
        airportMinutes: 40,
      },
    }),
  });
  assert.equal(sim.change.kind, "move_hotel");
  assert.equal(sim.status, "SIMULATION_ONLY");
  assert.equal(sim.impact.priceWonDelta, 5_000);
  assert.equal(sim.impact.travelMinutesDelta, 8);
  assert.equal(sim.impact.foodAccessMinutesDelta, 4);
  assert.equal(sim.impact.usjMinutesDelta, 20);
  assert.equal(sim.impact.airportMinutesDelta, -15);
  assert.ok(sim.impact.rippleEffects.length >= 3);
  assert.ok(sim.impact.linesKo.some((l) => /맛집/.test(l)));
  assert.ok(sim.impact.linesKo.some((l) => /USJ/.test(l)));
  assert.ok(sim.impact.linesKo.some((l) => /공항/.test(l)));
  console.log("  ✓ Hotel Change → Route/Food/USJ/Airport ripple ·", sim.impact.summaryKo);
}

// ─── Test 4 · Real World Commit ────────────────────────────────────
reset();
seedTrip();
{
  console.log('\n── Test 4 · "이 호텔 예약해" → Prepare → Human Commit → Ledger');
  // Product: "예약해" still goes through Prepare (never silent Commit)
  const prep = runRealityPrepare({
    entityId: "ent_namba",
    utterance: "이 호텔 예약 준비해",
    workspaceId: WS,
    action: "reservation_prepare",
    titleHint: "Namba Hotel",
    priceLabelKo: "150,000원",
    guests: 1,
  });
  assert.equal(prep.ok, true);
  if (!prep.ok) throw new Error("prepare failed");

  assert.equal(prep.prepare.status, "ready_for_commit");
  assert.equal(prep.executed, false);
  assert.equal(prep.awaitingCommit, true);

  const ai = runRealityCommit({
    source: "agent",
    approval: {
      approved: true,
      approvedAtIso: new Date().toISOString(),
      channel: "field",
    },
    prepare: prep.prepare,
    workspaceId: WS,
  });
  assert.equal(ai.ok, false);
  if (!ai.ok) assert.equal(ai.aiAttemptedCommit, true);

  const approvedAt = new Date().toISOString();
  const ok = runRealityCommit({
    source: "field",
    approval: {
      approved: true,
      approvedAtIso: approvedAt,
      channel: "field",
      approverId: "user_e2e",
    },
    prepareId: prep.prepare.prepareId,
    workspaceId: WS,
    entityId: "ent_namba",
  });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.transaction.externalApi.ok, true);
    assert.equal(ok.transaction.externalApi.provider, "reservation_provider");
    assert.equal(ok.ledgerEntry.actor, "user");
    assert.equal(ok.ledgerEntry.sourceDraftId, prep.prepare.prepareId);
    assert.equal(ok.ledgerEntry.approvedAt, approvedAt);
    assert.equal(ok.ledgerEntry.previousState.reservationStatus, "candidate");
    assert.equal(ok.ledgerEntry.newState.reservationStatus, "confirmed");
    assert.ok(ok.ledgerEntry.externalReference);
  }
  assert.equal(getRealityEntity("ent_namba")?.state.lifecycle, "committed");
  assert.equal(listRealityCommitLedger(WS).length, 1);
  console.log("  ✓ Prepare → User Confirmation → Booking API stub → Ledger");
}

reset();
console.log("\nok reality-os-e2e-next blueprint·diff·fatigue-agent·ripple·commit-ledger");
