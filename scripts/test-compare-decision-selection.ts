/**
 * Smoke: Compare Decision Select → Draft → Prepare (Commit-ready, not auto-Commit).
 */
import assert from "node:assert/strict";
import {
  applyCompareDecisionSelection,
  clearContextWorkspace,
  clearWorkspaceProjectionForTests,
  enterCompareDecisionProjection,
  isCompareDecisionProjectionActive,
  openMapContextWorkspace,
  readContextWorkspace,
  runCompareDecisionPipeline,
  type ContextWorkspaceNode,
} from "@/lib/context-workspace";
import { writeContextWorkspace } from "@/lib/context-workspace/workspace-store";
import { buildWorkspaceCommitPreview } from "@/lib/context-workspace/build-commit-preview";

function node(
  id: string,
  title: string,
): ContextWorkspaceNode {
  return {
    id,
    kind: "lodging",
    placeId: id,
    title,
    summaryKo: title,
    lat: 34.66,
    lng: 135.43,
    rating: 4.5,
    priceBand: 2,
    amountLabel: "120000원",
    thumbnailUrl: null,
    tags: [],
    visible: true,
    selected: false,
    bookmarked: false,
    source: "test",
  };
}

clearWorkspaceProjectionForTests();
const ctx = `cmp_sel_${Date.now()}`;
openMapContextWorkspace({
  contextEventId: ctx,
  query: "osaka",
  domain: "lodging",
  hits: [],
});
const state0 = readContextWorkspace(ctx)!;
writeContextWorkspace({
  ...state0,
  summaryKo: "Osaka Trip",
  nodes: [node("h1", "Hotel A"), node("h2", "Hotel B")],
  compareIds: [],
  selectedIds: [],
});

const pipe = runCompareDecisionPipeline({
  utterance: "호텔 비교해줘",
  contextEventId: ctx,
});
assert.equal(pipe.ok, true);
assert.equal(isCompareDecisionProjectionActive(ctx), true);

const decision = pipe.decisions.find((d) => d.entityId === "h1") ?? pipe.decisions[0]!;
const result = applyCompareDecisionSelection({
  contextEventId: ctx,
  entityId: decision.entityId,
  decision,
});

assert.equal(result.ok, true);
if (!result.ok) throw new Error("unreachable");

assert.equal(result.entityId, decision.entityId);
assert.ok(result.workspace.selectedIds.includes(decision.entityId));
const selectedNode = result.workspace.nodes.find((n) => n.id === decision.entityId);
assert.equal(selectedNode?.selected, true);
assert.ok(
  selectedNode?.actionReadyState === "prepare" ||
    selectedNode?.actionReadyState === "ready",
);
assert.equal(isCompareDecisionProjectionActive(ctx), false, "exit projection after select");
assert.ok(result.workspace.lastWhy?.actionKo === "Compare Decision 선택");
assert.ok(result.workspace.status !== "committed", "never auto-Commit");

const preview = buildWorkspaceCommitPreview(result.workspace);
assert.ok(preview.lines.some((l) => /Compare Decision|판단/.test(l.textKo)));

clearContextWorkspace(ctx);
clearWorkspaceProjectionForTests();

console.log("ok compare-decision-selection→draft→prepare", {
  prepared: result.prepared,
  actionReadyState: result.actionReadyState,
  replyKo: result.replyKo,
});
