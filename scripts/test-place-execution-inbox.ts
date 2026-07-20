#!/usr/bin/env npx tsx
/**
 * Place → Execution Inbox — prepare draft, never auto-Commit.
 */

import assert from "node:assert/strict";
import {
  buildExecutionInbox,
  buildRealityControlSnapshot,
  clearPreparedRealityOperations,
  enqueuePlacePrepToExecutionInbox,
  reflectRealityOperation,
  asQueueItem,
} from "../lib/reality-queue";
import { buildPlaceInfoFromFeedLines } from "../components/globe/globe-place-info-card";

clearPreparedRealityOperations();

const op = enqueuePlacePrepToExecutionInbox({
  contextEventId: "evt-dinner",
  contextLabelKo: "오늘 저녁",
  placeId: "place-imseongbo",
  placeName: "임성보동태찌개",
  kind: "eatery",
  partySize: 2,
  reserveAtLabelKo: "19:00",
  budgetWon: 15_000,
  reasonLinesKo: [
    "국물 점수 높음",
    "지금 이동 12분",
    "혼잡도 낮음",
    "예산 15,000원",
  ],
});

assert.equal(op.labelKo, "임성보동태찌개");
assert.equal(op.status, "pending");
assert.equal(op.needApproval, true);
assert.match(op.preview.summaryKo, /예약 준비 완료/);
assert.match(op.preview.summaryKo, /인원 2명/);
assert.match(op.preview.summaryKo, /19:00/);
assert.match(op.preview.summaryKo, /예약금 없음/);
assert.match(op.preview.summaryKo, /30,000원/);
assert.equal(op.detailKo, "아직 실행되지 않았습니다.");
assert.ok(op.dependencyNoteKo?.includes("국물 점수"));

const snap = buildRealityControlSnapshot({
  events: [],
  tradeSessions: [],
  applyHolds: false,
});
assert.ok(snap.items.some((item) => item.labelKo === "임성보동태찌개"));
assert.equal(snap.canCommit, false);

reflectRealityOperation(asQueueItem(op));
const ready = buildRealityControlSnapshot({
  events: [],
  tradeSessions: [],
  applyHolds: false,
});
assert.equal(ready.canCommit, true);

const inbox = buildExecutionInbox({
  items: ready.items,
  projectLabelKo: "오늘 저녁",
  canCommit: true,
});
assert.ok(inbox);
assert.ok(inbox!.checks.some((c) => c.labelKo.includes("임성보") || c.checked));

const info = buildPlaceInfoFromFeedLines({
  secondaryLine: "국물 · 대전 · 저녁",
  detailReasonLine: "국물 점수 높음 · 지금 이동 12분 · 혼잡도 낮음",
  openHoursLabel: "20:30까지",
  waitMinutes: 8,
  reservable: true,
  payable: true,
});
assert.ok(info.facts.some((fact) => fact.id === "hours"));
assert.ok(info.facts.some((fact) => fact.id === "wait"));
assert.ok(info.facts.some((fact) => fact.id === "reservable"));
assert.ok(info.reasons.some((reason) => reason.labelKo.includes("국물")));

clearPreparedRealityOperations();
console.log("test-place-execution-inbox: ok");
