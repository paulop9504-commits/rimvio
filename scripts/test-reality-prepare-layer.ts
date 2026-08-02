/**
 * Smoke: Reality Prepare Layer — Reservation Prepare, ready_for_commit, no execute.
 */
import assert from "node:assert/strict";
import {
  clearRealityGraphForTests,
  getRealityEntity,
  upsertRealityEntity,
} from "@/lib/reality-graph";
import {
  assertPrepareDoesNotExecute,
  clearPreparesForTests,
  listPrepares,
  looksLikeForbiddenPrepareUtterance,
  nextPrepareLifecycle,
  prepareHotelReservation,
  PREPARE_LIFECYCLE_STAGES,
  PREPARE_OBJECT_STATUS,
  readLatestPrepare,
  readPrepareObject,
  resolvePrepareAction,
  runRealityPrepare,
} from "@/lib/prepare-layer";

clearRealityGraphForTests();
clearPreparesForTests();

assert.deepEqual([...PREPARE_LIFECYCLE_STAGES], [
  "discovered",
  "candidate",
  "compared",
  "prepared",
  "committed",
]);
assert.equal(nextPrepareLifecycle("compared"), "prepared");
assert.equal(nextPrepareLifecycle("prepared"), null); // Commit not in this layer

upsertRealityEntity({
  id: "ent_hotel_namba",
  type: "Hotel",
  properties: {
    name: "Namba Hotel",
    priceWon: 150_000,
    priceLabelKo: "150,000원",
  },
  state: { lifecycle: "candidate", active: true },
});

assert.equal(resolvePrepareAction("이 호텔 예약 준비해"), "reservation_prepare");
assert.equal(resolvePrepareAction("결제해줘"), null);
assert.equal(looksLikeForbiddenPrepareUtterance("예약 확정"), true);
assert.equal(looksLikeForbiddenPrepareUtterance("구매 실행"), true);

assert.throws(() => assertPrepareDoesNotExecute("pay"));
assert.throws(() => assertPrepareDoesNotExecute("confirm_reservation"));
assert.throws(() => assertPrepareDoesNotExecute("purchase"));

const forbidden = runRealityPrepare({
  entityId: "ent_hotel_namba",
  utterance: "이 호텔 결제해줘",
  workspaceId: "ws-prep",
});
assert.equal(forbidden.ok, false);
if (!forbidden.ok) {
  assert.equal(forbidden.forbidden, true);
  assert.equal(forbidden.executed, false);
}

const result = prepareHotelReservation({
  entityId: "ent_hotel_namba",
  hotelTitle: "Namba Hotel",
  utterance: "이 호텔 예약 준비해",
  workspaceId: "ws-prep",
  priceLabelKo: "150,000원",
  guests: 2,
  checkInIso: "2026-08-10",
  checkOutIso: "2026-08-12",
  options: { breakfast: true, roomType: "twin" },
});

assert.equal(result.ok, true);
if (result.ok) {
  assert.equal(result.executed, false);
  assert.equal(result.awaitingCommit, true);
  assert.equal(result.prepare.status, PREPARE_OBJECT_STATUS);
  assert.equal(result.prepare.status, "ready_for_commit");
  assert.equal(result.prepare.lifecycle, "prepared");
  assert.equal(result.prepare.action, "reservation_prepare");
  assert.equal(result.prepare.entityId, "ent_hotel_namba");

  const payload = result.prepare.payload;
  assert.equal(payload.kind, "reservation");
  assert.equal(payload.hotelTitle, "Namba Hotel");
  assert.equal(payload.guests, 2);
  const dates = payload.dates as {
    checkInIso: string;
    checkOutIso: string;
    labelKo: string;
  };
  assert.equal(dates.checkInIso, "2026-08-10");
  assert.equal(dates.checkOutIso, "2026-08-12");
  const price = payload.price as { amountWon: number; labelKo: string };
  assert.equal(price.amountWon, 150_000);
  assert.ok(String(price.labelKo).includes("150"));
  const options = payload.options as Record<string, unknown>;
  assert.equal(options.breakfast, true);
  assert.equal(options.roomType, "twin");

  assert.ok(result.summaryKo.includes("Reservation Prepare"));
  assert.ok(result.summaryKo.includes("ready_for_commit"));
  assert.ok(result.summaryKo.includes("Commit 전 대기"));
  assert.ok(result.summaryKo.includes("예약 준비 완료"));
  assert.ok(result.summaryKo.includes("[예약 검토]"));
}

const stored = readPrepareObject(result.ok ? result.prepare.prepareId : "");
assert.ok(stored);
assert.equal(stored!.status, "ready_for_commit");
assert.equal(readLatestPrepare("ws-prep")?.prepareId, stored!.prepareId);
assert.equal(listPrepares("ws-prep").length, 1);

const entity = getRealityEntity("ent_hotel_namba");
assert.equal(entity?.state.lifecycle, "prepared");
assert.equal(entity?.state.readyForCommit, true);

// Flight / purchase candidate / schedule — still ready_for_commit only
const flight = runRealityPrepare({
  entityId: "ent_hotel_namba",
  utterance: "항공 정보 정리해줘",
  workspaceId: "ws-prep",
  action: "flight_prepare",
  titleHint: "ICN → KIX",
});
assert.equal(flight.ok, true);
if (flight.ok) {
  assert.equal(flight.prepare.action, "flight_prepare");
  assert.equal(flight.prepare.status, "ready_for_commit");
  assert.equal(flight.executed, false);
}

clearPreparesForTests();
clearRealityGraphForTests();

console.log("ok reality-prepare-layer reservation ready_for_commit no-execute");
