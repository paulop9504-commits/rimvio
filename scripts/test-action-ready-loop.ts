/**
 * Action-Ready Peek loop: ready → approved → (prepare queue) → committed.
 */
import assert from "node:assert/strict";
import {
  clearContextWorkspace,
  clearWorkspaceChat,
  prepareTripWorkspaceDraft,
  readContextWorkspace,
  resolvePeekPrimaryAction,
  setWorkspaceNodeActionReadyState,
  canAdvanceActionReady,
} from "../lib/context-workspace";

const CTX = "test:action-ready-loop";

clearWorkspaceChat(CTX);
clearContextWorkspace(CTX);

const state = prepareTripWorkspaceDraft({
  utterance: "오사카 4박5일 추천 일정",
  contextEventId: CTX,
  tripPrep: {
    destinationKo: "오사카",
    nights: 4,
    days: 5,
    checkInIso: null,
    checkOutIso: null,
  },
  expand: false,
});
assert.ok(state);

const lodging =
  state!.nodes.find((n) => n.kind === "lodging" && n.actionReadyState === "ready") ??
  state!.nodes.find((n) => n.actionReadyState === "ready");
assert.ok(lodging, "expected a ready draft node");

const confirm = resolvePeekPrimaryAction({
  node: lodging!,
  awaitingPrepare: false,
  prepareLabelKo: "예약 준비",
  prepareHintKo: "h",
  approveLabelKo: "승인 · 결제",
  approveHintKo: "h",
  confirmLabelKo: "이걸로 확인",
  confirmHintKo: "h",
  doneLabelKo: "완료됨",
});
assert.equal(confirm.kind, "confirm");

assert.equal(canAdvanceActionReady("ready", "approved"), true);
assert.equal(canAdvanceActionReady("committed", "ready"), false);

const approved = setWorkspaceNodeActionReadyState({
  contextEventId: CTX,
  nodeId: lodging!.id,
  state: "approved",
});
assert.ok(approved);
const approvedNode = approved!.nodes.find((n) => n.id === lodging!.id)!;
assert.equal(approvedNode.actionReadyState, "approved");

const prepareCta = resolvePeekPrimaryAction({
  node: approvedNode,
  awaitingPrepare: false,
  prepareLabelKo: "예약 준비",
  prepareHintKo: "h",
  approveLabelKo: "승인 · 결제",
  approveHintKo: "h",
  confirmLabelKo: "이걸로 확인",
  confirmHintKo: "h",
  doneLabelKo: "완료됨",
});
assert.equal(prepareCta.kind, "prepare");

const payCta = resolvePeekPrimaryAction({
  node: approvedNode,
  awaitingPrepare: true,
  prepareLabelKo: "예약 준비",
  prepareHintKo: "h",
  approveLabelKo: "승인 · 결제",
  approveHintKo: "h",
  confirmLabelKo: "이걸로 확인",
  confirmHintKo: "h",
  doneLabelKo: "완료됨",
});
assert.equal(payCta.kind, "approve_pay");

const committed = setWorkspaceNodeActionReadyState({
  contextEventId: CTX,
  nodeId: lodging!.id,
  state: "committed",
});
const committedNode = committed!.nodes.find((n) => n.id === lodging!.id)!;
assert.equal(committedNode.actionReadyState, "committed");

const done = resolvePeekPrimaryAction({
  node: committedNode,
  awaitingPrepare: false,
  prepareLabelKo: "예약 준비",
  prepareHintKo: "h",
  approveLabelKo: "승인 · 결제",
  approveHintKo: "h",
  confirmLabelKo: "이걸로 확인",
  confirmHintKo: "h",
  doneLabelKo: "완료됨",
});
assert.equal(done.kind, "done");

const draft = readContextWorkspace(CTX)?.realityDraft;
assert.ok(draft);
const draftNode = draft!.days
  .flatMap((d) => d.nodes)
  .find((n) => n.nodeId === lodging!.id);
assert.equal(draftNode?.actionReadyState, "committed");

clearWorkspaceChat(CTX);
clearContextWorkspace(CTX);
console.log("ok: action-ready ready→approved→committed");
