/**
 * Reality Draft SSOT — Chat Day View ↔ Map pins share one Prepared graph.
 */
import assert from "node:assert/strict";
import {
  buildRealityDraft,
  clearContextWorkspace,
  clearWorkspaceChat,
  prepareTripWorkspaceDraft,
  readContextWorkspace,
  readWorkspaceChat,
} from "../lib/context-workspace";
import { resolveIntentRoute } from "../lib/intent-router";

const CTX = "test:reality-draft-ssot";

clearWorkspaceChat(CTX);
clearContextWorkspace(CTX);

assert.equal(
  resolveIntentRoute({
    utterance: "오사카 4박5일 추천 일정",
    contextEventId: CTX,
  }).surface,
  "draft_preview",
);

const state = prepareTripWorkspaceDraft({
  utterance: "오사카 4박5일 추천 일정",
  contextEventId: CTX,
  tripPrep: { destinationKo: "오사카", nights: 4, days: 5, checkInIso: null, checkOutIso: null },
  expand: false,
});

assert.ok(state?.realityDraft);
assert.ok(state!.realityDraft!.days.length >= 2);
assert.equal(state!.realityDraft!.status, "prepared");

const day1 = state!.realityDraft!.days.find((d) => d.day === 1);
assert.ok(day1?.nodes.some((n) => /공항|APA|난바/i.test(n.title)));

const rebuilt = buildRealityDraft({
  contextTitleKo: "오사카 4박5일",
  destinationKo: "오사카",
  stayLabelKo: "4박5일",
  nodes: state!.nodes,
});
assert.ok(rebuilt);
assert.ok(rebuilt!.nodeIds.every((id) => state!.nodes.some((n) => n.id === id)));

const turns = readWorkspaceChat(CTX);
const asst = [...turns].reverse().find((t) => t.role === "assistant");
assert.ok(asst?.realityDraft?.days.length);

clearWorkspaceChat(CTX);
clearContextWorkspace(CTX);
console.log("ok: reality draft chat↔map SSOT");
