#!/usr/bin/env npx tsx
/**
 * Execution Inbox — Project → scout pack → 결재함 checklist → CEO Sign gate.
 */

import assert from "node:assert/strict";
import {
  EXECUTION_INBOX_PIPELINE,
  EXECUTION_INBOX_PIPELINE_PROGRESS_KO,
  buildExecutionInbox,
  buildRealityControlSnapshot,
  clearPreparedRealityOperations,
  enqueueTravelPrepareOperations,
  reflectRealityOperation,
  asQueueItem,
} from "../lib/reality-queue";

assert.ok(EXECUTION_INBOX_PIPELINE.includes("CEO_SIGN"));
assert.ok(EXECUTION_INBOX_PIPELINE.includes("REALITY_COMMIT"));
assert.equal(
  EXECUTION_INBOX_PIPELINE_PROGRESS_KO.PREP_COMPLETE,
  "모든 예약 준비가 끝났어요",
);
assert.equal(
  EXECUTION_INBOX_PIPELINE_PROGRESS_KO.EXECUTION_INBOX,
  "결재함으로 옮기는 중…",
);

clearPreparedRealityOperations();
const ops = enqueueTravelPrepareOperations({
  contextEventId: "evt-osaka-inbox",
  contextLabelKo: "오사카 여행",
  destinationLabelKo: "오사카",
});

assert.ok(ops.some((op) => op.kind === "flight"));
assert.ok(ops.some((op) => op.kind === "lodging"));
assert.ok(ops.some((op) => op.kind === "rental"));
assert.ok(ops.some((op) => op.kind === "eatery"));
assert.ok(ops.some((op) => op.labelKo === "총 결제금액"));

const snap = buildRealityControlSnapshot({
  events: [],
  tradeSessions: [],
  applyHolds: false,
});
assert.ok(snap.executionInbox);
assert.equal(snap.executionInbox!.eyebrowKo, "Execution Inbox");
assert.equal(snap.executionInbox!.projectLabelKo, "오사카 여행");

const labels = snap.executionInbox!.checks.map((c) => c.labelKo);
assert.ok(labels.some((l) => /대한항공|항공/.test(l)));
assert.ok(labels.some((l) => l.includes("호텔")));
assert.ok(labels.some((l) => l.includes("렌터카")));
assert.ok(labels.some((l) => l.includes("맛집")));
assert.ok(labels.some((l) => l.includes("총 결제금액")));
assert.ok(labels.some((l) => l.includes("취소 정책")));
assert.ok(labels.some((l) => l.includes("일정 충돌")));
assert.ok(labels.some((l) => l.includes("AI 검토")));

assert.equal(snap.canCommit, false);

for (const op of ops) {
  reflectRealityOperation(asQueueItem(op));
}

const readySnap = buildRealityControlSnapshot({
  events: [],
  tradeSessions: [],
  applyHolds: false,
});
assert.equal(readySnap.canCommit, true);
assert.equal(readySnap.executionInbox!.readyForSign, true);
assert.equal(readySnap.executionInbox!.stage, "inbox_ready");

const inboxOnly = buildExecutionInbox({
  items: readySnap.items,
  projectLabelKo: "오사카 여행",
  canCommit: true,
});
assert.ok(inboxOnly);
assert.equal(inboxOnly!.checks.length, 8);
assert.ok(inboxOnly!.checks.every((c) => c.checked));

clearPreparedRealityOperations();
console.log("test-execution-inbox: ok");
