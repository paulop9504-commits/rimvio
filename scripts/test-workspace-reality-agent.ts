/**
 * Smoke: Workspace Reality Agent — hotel change proposal, no Reality Commit.
 */
import assert from "node:assert/strict";
import { openMapContextWorkspace } from "@/lib/context-workspace/open-map-workspace";
import {
  clearContextWorkspace,
  readContextWorkspace,
} from "@/lib/context-workspace/workspace-store";
import { applyWorkspaceTransition } from "@/lib/context-workspace/apply-workspace-transition";
import {
  addRealityRelation,
  clearRealityGraphForTests,
  upsertRealityEntity,
} from "@/lib/reality-graph";
import {
  clearDraftMutationsForTests,
  listProposedDrafts,
  readDraftMutation,
} from "@/lib/workspace-command";
import {
  clearAllWorkspacesForTests,
  createWorkspace,
} from "@/lib/workspace";
import {
  runWorkspaceRealityAgent,
  readWorkspaceAgentContext,
} from "@/lib/workspace-agent";

clearRealityGraphForTests();
clearAllWorkspacesForTests();
clearDraftMutationsForTests();

const eventId = "ws-agent-osaka";
clearContextWorkspace(eventId);

openMapContextWorkspace({
  contextEventId: eventId,
  domain: "lodging",
  query: "Osaka Trip",
  summaryKo: "Osaka Trip",
  source: "test",
  candidates: [
    {
      id: "ent_namba_hotel",
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
      id: "ent_alt_hotel",
      labelKo: "Budget Capsule",
      domain: "lodging",
      lat: 34.666,
      lng: 135.501,
      rating: 7.5,
      priceBand: 1,
      amountLabel: "45,000원",
      reservable: true,
      localFavorite: false,
      source: "maps",
    },
  ],
});

applyWorkspaceTransition({
  contextEventId: eventId,
  op: "select",
  nodeIds: [
    readContextWorkspace(eventId)?.nodes.find((n) =>
      n.title.includes("Namba"),
    )?.id ?? "",
  ].filter(Boolean),
  changeKo: "가격 상승 반영",
});

upsertRealityEntity({
  id: "ent_namba_hotel",
  type: "Hotel",
  properties: {
    name: "Namba Hotel",
    title: "Namba Hotel",
    priceRising: true,
    priceWon: 150_000,
    priceLabelKo: "150,000원",
    rating: 4.5,
    travelMinutes: 20,
    tags: "namba,hotel",
    category: "business",
  },
});
upsertRealityEntity({
  id: "ent_alt_hotel",
  type: "Hotel",
  properties: {
    name: "Budget Capsule",
    priceWon: 120_000,
    priceLabelKo: "120,000원",
    rating: 4.3,
    travelMinutes: 30,
    tags: "namba,hotel",
    category: "business",
  },
});
addRealityRelation({
  kind: "SimilarTo",
  fromId: "ent_namba_hotel",
  toId: "ent_alt_hotel",
});

createWorkspace({
  id: eventId,
  contextId: eventId,
  seeds: [
    {
      realityObjectId: "ent_namba_hotel",
      entityId: "ent_namba_hotel",
      kind: "hotel",
      title: "Namba Hotel",
      priceLabelKo: "150,000원",
      rating: 4.5,
      attrs: { priceRising: true, travelMinutes: 20, priceWon: 150_000 },
    },
    {
      realityObjectId: "ent_alt_hotel",
      entityId: "ent_alt_hotel",
      kind: "hotel",
      title: "Budget Capsule",
      priceLabelKo: "120,000원",
      rating: 4.3,
      attrs: { travelMinutes: 30, priceWon: 120_000 },
    },
  ],
});

const observed = readWorkspaceAgentContext(eventId);
assert.equal(observed.ok, true);
if (observed.ok) {
  assert.ok(observed.context.contextTitleKo.includes("Osaka"));
  assert.ok(observed.context.currentHotel?.title.includes("Namba"));
}

const inactive = runWorkspaceRealityAgent({
  workspaceId: "missing-ws",
  utterance: "호텔 바꿔줘",
});
assert.equal(inactive.ok, false);
if (!inactive.ok) assert.equal(inactive.inactiveWorkspace, true);

const commit = runWorkspaceRealityAgent({
  workspaceId: eventId,
  utterance: "지구에 남겨줘",
});
assert.equal(commit.ok, false);
if (!commit.ok) assert.equal(commit.realityCommitAttempted, true);

const result = runWorkspaceRealityAgent({
  workspaceId: eventId,
  utterance: "호텔 바꿔줘",
});
assert.equal(result.ok, true);
if (result.ok) {
  assert.equal(result.phase, "request_apply");
  assert.equal(result.proposalKind, "hotel_change");
  assert.equal(result.intent.action, "replace");
  assert.ok(result.plan.steps.some((s) => s.kind === "explore_alternatives"));
  assert.ok(result.plan.steps.some((s) => s.kind === "analyze_impact"));
  assert.ok(result.plan.steps.some((s) => s.kind === "create_draft"));
  assert.equal(result.proposal.draft.status, "proposed");
  assert.equal(result.validation.realityCommitBlocked, true);
  assert.ok(result.simulation);
  assert.equal(result.simulation!.status, "SIMULATION_ONLY");
  assert.equal(result.simulation!.impact.priceWonDelta, -30_000);
  assert.equal(result.simulation!.impact.travelMinutesDelta, 10);
  assert.equal(result.simulation!.impact.ratingDelta, -0.2);
  assert.ok(result.summaryKo.includes("Hotel Change") || result.summaryKo.includes("Namba"));
  assert.ok(result.summaryKo.includes("Reality Commit 없음"));
}

const proposed = listProposedDrafts(eventId);
assert.ok(proposed.length >= 1);
const draft = readDraftMutation(proposed[proposed.length - 1]!.id);
assert.equal(draft?.status, "proposed");
assert.equal(draft?.afterState.proposalKind, "hotel_change");

clearContextWorkspace(eventId);
clearAllWorkspacesForTests();
clearDraftMutationsForTests();
clearRealityGraphForTests();

console.log("ok workspace-reality-agent hotel-change-proposal draft-only");
