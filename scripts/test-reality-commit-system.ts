/**
 * Smoke: Reality Commit System — Prepare → Gate → User Approval → Tx → Ledger.
 * AI cannot Commit. Hotel Reservation candidate → confirmed.
 */
import assert from "node:assert/strict";
import {
  clearRealityGraphForTests,
  getRealityEntity,
  upsertRealityEntity,
} from "@/lib/reality-graph";
import {
  clearPreparesForTests,
  prepareHotelReservation,
} from "@/lib/prepare-layer";
import {
  assertAiCannotCommit,
  clearRealityCommitLedgerForTests,
  clearRealityCommitTransactionsForTests,
  listRealityCommitLedger,
  readRealityCommitTransaction,
  REALITY_COMMIT_ACTOR,
  runCommitGate,
  runRealityCommit,
} from "@/lib/reality-commit";

clearRealityGraphForTests();
clearPreparesForTests();
clearRealityCommitLedgerForTests();
clearRealityCommitTransactionsForTests();

upsertRealityEntity({
  id: "ent_hotel_commit",
  type: "Hotel",
  properties: {
    name: "Namba Hotel",
    priceWon: 150_000,
    priceLabelKo: "150,000원",
  },
  state: { lifecycle: "candidate", active: true },
});

const prepared = prepareHotelReservation({
  entityId: "ent_hotel_commit",
  hotelTitle: "Namba Hotel",
  utterance: "이 호텔 예약 준비해",
  workspaceId: "ws-commit",
  priceLabelKo: "150,000원",
  guests: 2,
  checkInIso: "2026-08-10",
  checkOutIso: "2026-08-12",
});
assert.equal(prepared.ok, true);
if (!prepared.ok) throw new Error("prepare failed");

assert.equal(prepared.prepare.status, "ready_for_commit");
assert.throws(() => assertAiCannotCommit("ai"));
assert.throws(() => assertAiCannotCommit("agent"));
assert.throws(() => assertAiCannotCommit("callout"));

// Gate fail — no approval
const gateNoApproval = runCommitGate({
  source: "field",
  approval: null,
  prepare: prepared.prepare,
  entityId: "ent_hotel_commit",
});
assert.equal(gateNoApproval.ok, false);

// AI rejected
const aiCommit = runRealityCommit({
  source: "ai",
  approval: {
    approved: true,
    approvedAtIso: new Date().toISOString(),
    channel: "field",
  },
  prepare: prepared.prepare,
  workspaceId: "ws-commit",
});
assert.equal(aiCommit.ok, false);
if (!aiCommit.ok) assert.equal(aiCommit.aiAttemptedCommit, true);

const unapproved = runRealityCommit({
  source: "field",
  approval: {
    approved: false,
    approvedAtIso: new Date().toISOString(),
    channel: "field",
  },
  prepareId: prepared.prepare.prepareId,
  workspaceId: "ws-commit",
});
assert.equal(unapproved.ok, false);

const approvedAt = new Date().toISOString();
const committed = runRealityCommit({
  source: "field",
  approval: {
    approved: true,
    approvedAtIso: approvedAt,
    channel: "field",
    approverId: "user_1",
  },
  prepareId: prepared.prepare.prepareId,
  workspaceId: "ws-commit",
  entityId: "ent_hotel_commit",
});

assert.equal(committed.ok, true);
if (committed.ok) {
  assert.equal(committed.transaction.actor, REALITY_COMMIT_ACTOR);
  assert.equal(committed.transaction.actor, "user");
  assert.equal(committed.transaction.type, "hotel_reservation");
  assert.equal(committed.transaction.status, "committed");
  assert.equal(committed.transaction.beforeState.reservationStatus, "candidate");
  assert.equal(committed.transaction.afterState.reservationStatus, "confirmed");
  assert.ok(typeof committed.transaction.timestamp === "string");
  assert.ok(committed.transaction.timestamp.length > 0);
  assert.equal(committed.transaction.externalApi.ok, true);
  assert.ok(committed.stagesCompleted.includes("user_approval"));
  assert.ok(committed.stagesCompleted.includes("reality_transaction"));
  assert.ok(committed.stagesCompleted.includes("external_api"));
  assert.ok(committed.stagesCompleted.includes("ledger"));
  assert.equal(committed.ledgerEntry.actor, "user");
  assert.ok(committed.summaryKo.includes("Hotel Reservation"));
  assert.ok(committed.summaryKo.includes("confirmed"));

  const tx = readRealityCommitTransaction(committed.transaction.id);
  assert.ok(tx);
  assert.equal(tx!.beforeState.reservationStatus, "candidate");
  assert.equal(tx!.afterState.reservationStatus, "confirmed");
}

const entity = getRealityEntity("ent_hotel_commit");
assert.equal(entity?.state.lifecycle, "committed");
assert.equal(entity?.state.reservationStatus, "confirmed");

const ledger = listRealityCommitLedger("ws-commit");
assert.equal(ledger.length, 1);
assert.equal(ledger[0]?.type, "hotel_reservation");
assert.equal(ledger[0]?.beforeState.reservationStatus, "candidate");
assert.equal(ledger[0]?.afterState.reservationStatus, "confirmed");
assert.equal(ledger[0]?.actor, "user");
assert.equal(ledger[0]?.sourceDraftId, prepared.prepare.prepareId);
assert.ok(ledger[0]?.approvedAt);
assert.equal(ledger[0]?.previousState.reservationStatus, "candidate");
assert.equal(ledger[0]?.newState.reservationStatus, "confirmed");
assert.ok(String(ledger[0]?.externalReference ?? "").length > 0);

clearPreparesForTests();
clearRealityCommitLedgerForTests();
clearRealityCommitTransactionsForTests();
clearRealityGraphForTests();

console.log(
  "ok reality-commit-system hotel-reservation candidate→confirmed actor:user",
);
