/**
 * Smoke: Reality Draft Engine — Before / After / Impact / Apply.
 * AI never mutates Reality; Draft status proposed → approved.
 */
import assert from "node:assert/strict";
import {
  REALITY_DRAFT_STATUSES,
  approveDraft,
  assertAiDoesNotMutateReality,
  buildDraftDiff,
  clearDraftsForTests,
  computeDraftImpact,
  createDraft,
  createDraftFromIntent,
  formatDraftDiffUxKo,
  formatDraftUxCardKo,
  listDrafts,
  readDraft,
  rejectDraft,
} from "@/lib/draft";
import {
  clearDraftMutationsForTests,
} from "@/lib/workspace-command";
import {
  clearAllWorkspacesForTests,
  createWorkspace,
  readWorkspace,
} from "@/lib/workspace";

clearAllWorkspacesForTests();
clearDraftMutationsForTests();
clearDraftsForTests();

assert.deepEqual(
  [...REALITY_DRAFT_STATUSES],
  ["proposed", "approved", "rejected"],
);

// Impact: 5 → 1 = -80% 후보 감소
const impact = computeDraftImpact(5, 1);
assert.equal(impact.deltaPct, -80);
assert.equal(impact.pctLabelKo, "-80%");
assert.equal(impact.effectLabelKo, "후보 감소");
assert.equal(impact.labelKo, "-80% · 후보 감소");

const diff = buildDraftDiff({
  before: { labelKo: "호텔 전체", visibleCount: 5, hotelType: "all" },
  after: { labelKo: "캡슐호텔", visibleCount: 1, hotelType: "capsule" },
});
assert.equal(diff.impact.deltaPct, -80);

const ux = formatDraftDiffUxKo(diff);
assert.ok(ux.includes("Before"));
assert.ok(ux.includes("호텔 전체"));
assert.ok(ux.includes("After"));
assert.ok(ux.includes("캡슐호텔"));
assert.ok(ux.includes("Impact"));
assert.ok(ux.includes("-80%"));
assert.ok(ux.includes("후보 감소"));

// AI cannot mutate Reality
assert.throws(
  () => assertAiDoesNotMutateReality("ai"),
  /cannot mutate Reality/,
);

// Manual Draft create → proposed
const draft = createDraft({
  workspaceId: "ws-draft",
  before: diff.before,
  after: diff.after,
  impact: diff.impact,
  sourceText: "캡슐호텔만 보여줘",
});
assert.equal(draft.status, "proposed");
assert.equal(draft.draftOnly, true);
assert.equal(draft.before.labelKo, "호텔 전체");
assert.equal(draft.after.labelKo, "캡슐호텔");
assert.equal(draft.impact.deltaPct, -80);

const card = formatDraftUxCardKo(draft);
assert.ok(card.includes("[Apply]"));

// Reject path
const rejected = createDraft({
  workspaceId: "ws-draft",
  before: diff.before,
  after: diff.after,
});
const rej = rejectDraft(rejected.id);
assert.equal(rej.ok, true);
if (rej.ok) assert.equal(rej.draft.status, "rejected");

// Intent → Draft with workspace hotels (5 → 1 capsule)
createWorkspace({
  id: "ws-draft-intent",
  contextId: "ws-draft-intent",
  seeds: [
    { realityObjectId: "h1", kind: "hotel", title: "Biz A", attrs: { category: "business" } },
    { realityObjectId: "h2", kind: "hotel", title: "Biz B", attrs: { category: "business" } },
    { realityObjectId: "h3", kind: "hotel", title: "Biz C", attrs: { category: "business" } },
    { realityObjectId: "h4", kind: "hotel", title: "Biz D", attrs: { category: "business" } },
    {
      realityObjectId: "h5",
      kind: "hotel",
      title: "Capsule",
      tags: ["capsule"],
      attrs: { category: "capsule", hotelType: "capsule" },
    },
  ],
});

const fromIntent = createDraftFromIntent({
  workspaceId: "ws-draft-intent",
  sourceText: "캡슐호텔만 보여줘",
  intent: {
    action: "modify_context",
    target: "hotel",
    parameters: { hotelType: "capsule", category: "capsule" },
  },
});
assert.equal(fromIntent.status, "proposed");
assert.equal(fromIntent.before.labelKo, "호텔 전체");
assert.equal(fromIntent.after.labelKo, "캡슐호텔");
assert.equal(fromIntent.before.visibleCount, 5);
assert.equal(fromIntent.after.visibleCount, 1);
assert.equal(fromIntent.impact.deltaPct, -80);
assert.ok(fromIntent.workspaceDraftId);

// Apply → approved (Workspace Instance only)
const beforeWs = readWorkspace("ws-draft-intent")!;
assert.equal(beforeWs.objects.filter((o) => o.visible).length, 5);

const applied = approveDraft(fromIntent.id);
assert.equal(applied.ok, true);
if (applied.ok) {
  assert.equal(applied.draft.status, "approved");
  assert.equal(applied.applyLabelKo, "Apply");
}

const afterWs = readWorkspace("ws-draft-intent")!;
assert.equal(afterWs.objects.filter((o) => o.kind === "hotel" && o.visible).length, 1);
assert.equal(readDraft(fromIntent.id)?.status, "approved");
assert.equal(listDrafts("ws-draft-intent", "approved").length, 1);

// Cannot re-apply
const again = approveDraft(fromIntent.id);
assert.equal(again.ok, false);

clearDraftsForTests();
clearDraftMutationsForTests();
clearAllWorkspacesForTests();

console.log(
  "ok reality-draft-engine Before→After Impact -80% Apply→approved",
);
