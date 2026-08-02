/**
 * Smoke: Draft Action Engine — propose → RealityDiff → apply (Reality untouched).
 */
import assert from "node:assert/strict";
import { openMapContextWorkspace } from "@/lib/context-workspace/open-map-workspace";
import {
  clearContextWorkspace,
  readContextWorkspace,
} from "@/lib/context-workspace/workspace-store";
import {
  clearRealityObjects,
  createRealityObject,
  getRealityObject,
} from "@/lib/reality-object/reality-object-store";
import {
  applyDraftMutation,
  clearCommandHistoryForTests,
  clearDraftMutationsForTests,
  listCommandHistory,
  listProposedDrafts,
  rejectDraftMutation,
  resolveWorkspaceIntent,
  runWorkspaceCommandRuntime,
  createWorkspaceCommand,
} from "@/lib/workspace-command";
import {
  clearAllWorkspacesForTests,
  clearAllWorkspaceHistoryForTests,
  createWorkspace,
  readWorkspace,
} from "@/lib/workspace";

clearRealityObjects();
clearAllWorkspacesForTests();
clearAllWorkspaceHistoryForTests();
clearDraftMutationsForTests();
clearCommandHistoryForTests();

const eventId = "ws-draft-osaka";
clearContextWorkspace(eventId);

const rAll = createRealityObject({
  objectId: "reality_apa",
  entityId: "e1",
  contextId: eventId,
  kind: "hotel",
  labelKo: "APA Hotel",
  relationships: [],
  availableActions: [],
  metadata: {},
});
const rCap = createRealityObject({
  objectId: "reality_cap",
  entityId: "e2",
  contextId: eventId,
  kind: "hotel",
  labelKo: "Capsule",
  relationships: [],
  availableActions: [],
  metadata: {},
});
const rAllAt = rAll.updatedAt;
const rCapAt = rCap.updatedAt;

openMapContextWorkspace({
  contextEventId: eventId,
  domain: "lodging",
  query: "오사카 여행",
  summaryKo: "오사카 여행",
  source: "test",
  candidates: [
    {
      id: "maps:apa",
      labelKo: "APA Hotel",
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
      id: "maps:cap",
      labelKo: "난바 캡슐호텔",
      domain: "lodging",
      lat: 34.665,
      lng: 135.5,
      rating: 7.5,
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
      realityObjectId: "reality_apa",
      kind: "hotel",
      title: "APA Hotel",
      attrs: { category: "business" },
    },
    {
      realityObjectId: "reality_cap",
      kind: "hotel",
      title: "난바 캡슐호텔",
      tags: ["capsule"],
      attrs: { hotelType: "capsule", category: "capsule" },
    },
  ],
});

const cmd = createWorkspaceCommand({
  workspaceId: eventId,
  rawText: "오사카 여행에서 캡슐호텔만 보고 싶어",
});
const intent = resolveWorkspaceIntent(cmd);
assert.ok(intent);
assert.equal(intent!.action, "modify_context");
assert.equal(intent!.target, "hotel");
assert.equal(intent!.parameters.hotelType, "capsule");

const runtime = runWorkspaceCommandRuntime({
  workspaceId: eventId,
  rawText: "오사카 여행에서 캡슐호텔만 보고 싶어",
});
assert.equal(runtime.ok, true);
if (runtime.ok) {
  assert.equal(runtime.mode, "proposed");
  assert.ok(runtime.proposal);
  assert.equal(runtime.proposal!.draft.status, "proposed");
  assert.equal(runtime.proposal!.draft.realityDiff.after.hotelType, "capsule");
  assert.ok(
    (runtime.proposal!.draft.impact.visibleHotelsDeltaPct ?? 0) <= 0,
  );
}

// Propose must NOT change Workspace visibility yet
assert.equal(readWorkspace(eventId)!.objects.filter((o) => o.visible).length, 2);

const proposed = listProposedDrafts(eventId);
assert.equal(proposed.length, 1);

const applied = applyDraftMutation(proposed[0]!.id);
assert.equal(applied.ok, true);

const after = readWorkspace(eventId)!;
assert.equal(after.objects.filter((o) => o.visible).length, 1);
assert.ok(after.objects.find((o) => o.visible)?.title.includes("캡슐"));

// Reality Object originals untouched
assert.equal(getRealityObject("reality_apa")!.updatedAt, rAllAt);
assert.equal(getRealityObject("reality_cap")!.updatedAt, rCapAt);
assert.equal(getRealityObject("reality_apa")!.labelKo, "APA Hotel");

const hist = listCommandHistory(eventId);
assert.ok(hist.length >= 1);
assert.ok(hist[0]!.userInput.includes("캡슐"));

// Cancel path
clearDraftMutationsForTests(eventId);
const r2 = runWorkspaceCommandRuntime({
  workspaceId: eventId,
  rawText: "저렴한 호텔만",
});
assert.ok(r2.ok && r2.mode === "proposed");
if (r2.ok && r2.proposal) {
  const rejected = rejectDraftMutation(r2.proposal.draft.id);
  assert.equal(rejected.ok, true);
  assert.equal(rejected.ok && rejected.draft.status, "rejected");
}

clearContextWorkspace(eventId);
clearAllWorkspacesForTests();
clearDraftMutationsForTests();
clearCommandHistoryForTests();
clearRealityObjects();

console.log(
  "ok workspace-draft-action-engine propose→diff→apply Reality-readonly",
);
