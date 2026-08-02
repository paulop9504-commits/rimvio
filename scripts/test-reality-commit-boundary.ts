/**
 * Smoke: Reality Commit Boundary — Callout cannot Commit; Field path records Ledger.
 */
import assert from "node:assert/strict";
import {
  assertCalloutCannotCommit,
  buildFieldHandoffFromCallout,
  CALLOUT_ALLOWED_MODES,
  clearCommitLedgerForTests,
  filterCalloutModes,
  listCommitLedgerEntries,
  runFieldRealityCommit,
} from "@/lib/callout/commit-boundary";
import { buildCalloutViewModel } from "@/lib/callout";
import type { RimvioObject } from "@/lib/callout/types";

assert.deepEqual([...CALLOUT_ALLOWED_MODES], [
  "observe",
  "explore",
  "simulate",
  "prepare",
]);
assert.deepEqual(
  filterCalloutModes(["observe", "commit", "prepare", "explore"]),
  ["observe", "prepare", "explore"],
);

assert.throws(() => assertCalloutCannotCommit("commit"));
assert.throws(() => assertCalloutCannotCommit("reality_commit"));

const calloutAttempt = runFieldRealityCommit({
  request: {
    contextId: "ctx",
    objectId: "hotel_1",
    title: "Namba Hotel",
    labelKo: "예약 확정",
  },
  userApproved: true,
  source: "callout",
});
assert.equal(calloutAttempt.ok, false);
if (!calloutAttempt.ok) {
  assert.equal(calloutAttempt.calloutAttemptedCommit, true);
}

const unapproved = runFieldRealityCommit({
  request: {
    contextId: "ctx",
    objectId: "hotel_1",
    title: "Namba Hotel",
    labelKo: "예약 확정",
  },
  userApproved: false,
  source: "field",
});
assert.equal(unapproved.ok, false);

clearCommitLedgerForTests("ctx");
const ok = runFieldRealityCommit({
  request: {
    contextId: "ctx",
    objectId: "hotel_1",
    title: "Namba Hotel",
    labelKo: "예약 확정",
  },
  userApproved: true,
  source: "field",
});
assert.equal(ok.ok, true);
if (ok.ok) {
  assert.ok(ok.stagesCompleted.includes("field_action"));
  assert.ok(ok.stagesCompleted.includes("reality_transaction"));
  assert.ok(ok.stagesCompleted.includes("user_approval"));
  assert.ok(ok.stagesCompleted.includes("commit_ledger"));
  assert.equal(ok.ledgerEntry.status, "recorded");
}

const ledger = listCommitLedgerEntries("ctx");
assert.equal(ledger.length, 1);
assert.equal(ledger[0]?.objectId, "hotel_1");

const handoff = buildFieldHandoffFromCallout({
  contextId: "ctx",
  objectId: "hotel_1",
  title: "Namba Hotel",
});
assert.equal(handoff.fieldActionLabelKo, "예약 확정");
assert.equal(handoff.blockedInCallout, true);

const object: RimvioObject = {
  id: "hotel_1",
  type: "hotel",
  title: "Namba Hotel",
  location: { lat: 34.66, lng: 135.5 },
  contextId: "ctx",
  state: "prepared",
  evidence: [],
  actions: [],
  facts: {
    priceLabelKo: "120,000원",
    rating: null,
    reviewSummaryKo: null,
    whyLinesKo: [],
    canPrepare: true,
    selected: true,
    bookmarked: false,
    inCompare: false,
  },
};

const model = buildCalloutViewModel({ object });
assert.ok(model);
assert.ok(!model!.modes.includes("commit" as never));
assert.equal(model!.fieldHandoff.ctaKo, "예약 확정");
assert.ok(model!.prepare.fieldActionCtaKo.includes("예약"));

console.log(
  "ok reality-commit-boundary",
  CALLOUT_ALLOWED_MODES.join(","),
  ok.ok && ok.stagesCompleted.join("→"),
);
