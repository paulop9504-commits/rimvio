/**
 * Smoke: Workspace Agent Runtime — Observe → Reason → Plan → Draft → Validate.
 * AI Operator UX · Agent Commit forbidden.
 */
import assert from "node:assert/strict";
import {
  AGENT_RUNTIME_PHASES,
  executeAgentCommit,
  formatAgentOperatorUxKo,
  isAgentCommitForbidden,
  observeAgentRuntime,
  runAgentRuntime,
} from "@/lib/agent";
import { clearDraftsForTests, readDraft } from "@/lib/draft";
import { openMapContextWorkspace } from "@/lib/context-workspace/open-map-workspace";
import {
  applyWorkspaceTransition,
} from "@/lib/context-workspace/apply-workspace-transition";
import {
  clearContextWorkspace,
  readContextWorkspace,
} from "@/lib/context-workspace/workspace-store";
import {
  addRealityRelation,
  clearRealityGraphForTests,
  upsertRealityEntity,
} from "@/lib/reality-graph";
import {
  clearDraftMutationsForTests,
} from "@/lib/workspace-command";
import {
  clearAllWorkspacesForTests,
  createWorkspace,
} from "@/lib/workspace";

clearRealityGraphForTests();
clearAllWorkspacesForTests();
clearDraftMutationsForTests();
clearDraftsForTests();

assert.deepEqual(
  [...AGENT_RUNTIME_PHASES],
  ["observe", "reason", "plan", "draft", "validate"],
);
assert.equal(isAgentCommitForbidden("지구에 남겨줘"), true);
assert.throws(() => executeAgentCommit(), /Commit forbidden|Reality Commit/);

const eventId = "ws-agent-runtime";
clearContextWorkspace(eventId);

const hotels = Array.from({ length: 12 }, (_, i) => ({
  id: `ent_h_${i}`,
  labelKo: i === 0 ? "Namba Hotel" : `Hotel ${i}`,
  domain: "lodging" as const,
  lat: 34.665 + i * 0.001,
  lng: 135.5 + i * 0.001,
  rating: 7,
  priceBand: i === 0 ? 3 : 2,
  amountLabel: i === 0 ? "180,000원" : "90,000원",
  reservable: true,
  localFavorite: false,
  source: "maps" as const,
}));

openMapContextWorkspace({
  contextEventId: eventId,
  domain: "lodging",
  query: "Osaka Trip",
  summaryKo: "Osaka Trip",
  source: "test",
  candidates: hotels,
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
  id: "ent_h_0",
  type: "Hotel",
  properties: {
    name: "Namba Hotel",
    priceRising: true,
    priceWon: 180_000,
    priceLabelKo: "180,000원",
    rating: 4.2,
    travelMinutes: 18,
  },
});
upsertRealityEntity({
  id: "ent_h_1",
  type: "Hotel",
  properties: {
    name: "Budget Capsule",
    priceWon: 45_000,
    priceLabelKo: "45,000원",
    rating: 4.0,
    travelMinutes: 22,
  },
});
addRealityRelation({
  id: "rel_sim_runtime",
  fromId: "ent_h_0",
  toId: "ent_h_1",
  type: "similar",
  weight: 0.9,
});

createWorkspace({
  id: eventId,
  contextId: eventId,
  seeds: hotels.map((h, i) => ({
    realityObjectId: h.id,
    entityId: h.id,
    kind: "hotel" as const,
    title: h.labelKo,
    selected: i === 0,
    priceLabelKo: h.amountLabel,
    attrs: { category: i === 0 ? "business" : "budget" },
  })),
});

const observed = observeAgentRuntime(eventId);
assert.equal(observed.ok, true);
if (observed.ok) {
  assert.equal(observed.observation.hotelCandidateCount, 12);
  assert.equal(observed.observation.currentLabelKo, "호텔 후보 12개");
}

const result = runAgentRuntime({
  workspaceId: eventId,
  utterance: "가격 올랐어 다른 호텔 찾아줘",
});
assert.equal(result.ok, true);
if (result.ok) {
  assert.equal(result.phase, "validate");
  assert.equal(result.commitForbidden, true);
  assert.equal(result.observation.currentLabelKo, "호텔 후보 12개");
  assert.equal(result.reasoning.problemKo, "가격 상승");
  assert.equal(result.reasoning.recommendationKo, "대체 호텔 발견");
  assert.equal(result.draft.status, "proposed");
  assert.equal(result.validation.realityCommitBlocked, true);
  assert.ok(result.plan.steps.length === 5);
  assert.ok(result.plan.commitForbidden);

  const ux = formatAgentOperatorUxKo({
    observation: result.observation,
    reasoning: result.reasoning,
  });
  assert.ok(ux.includes("AI Operator"));
  assert.ok(ux.includes("호텔 후보 12개"));
  assert.ok(ux.includes("가격 상승"));
  assert.ok(ux.includes("대체 호텔 발견"));
  assert.ok(result.uxKo.includes("AI Operator"));

  assert.equal(readDraft(result.draft.id)?.status, "proposed");
}

const commit = runAgentRuntime({
  workspaceId: eventId,
  utterance: "지구에 남겨줘",
});
assert.equal(commit.ok, false);
if (!commit.ok) {
  assert.equal(commit.realityCommitAttempted, true);
}

clearDraftsForTests();
clearDraftMutationsForTests();
clearAllWorkspacesForTests();
clearRealityGraphForTests();
clearContextWorkspace(eventId);

console.log(
  "ok agent-runtime Observe→Reason→Plan→Draft→Validate AI Operator · no Commit",
);
