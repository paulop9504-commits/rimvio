/**
 * Smoke: Prepare Mode ReservationDraft — never Commit.
 */
import assert from "node:assert/strict";
import {
  assertPrepareDoesNotCommit,
  buildPrepareChecklist,
  createReservationDraft,
  readReservationDraft,
  writeReservationDraft,
  clearReservationDraft,
} from "@/lib/callout/prepare";
import type { RimvioObject } from "@/lib/callout/types";

const object: RimvioObject = {
  id: "hotel_123",
  type: "hotel",
  title: "Namba Hotel",
  location: { lat: 34.66, lng: 135.5 },
  contextId: "ctx_1",
  state: "shortlisted",
  evidence: [
    {
      id: "price",
      type: "price",
      title: "예산",
      value: "120,000원",
      weight: 0.2,
      source: "node",
      present: true,
      graphRef: null,
    },
    {
      id: "distance",
      type: "distance",
      title: "거리",
      value: "4분",
      weight: 0.2,
      source: "edge",
      present: true,
      graphRef: null,
    },
  ],
  actions: [],
  facts: {
    priceLabelKo: "120,000원",
    rating: 8.8,
    reviewSummaryKo: "후기 40",
    whyLinesKo: ["난바역 4분"],
    canPrepare: true,
    selected: true,
    bookmarked: false,
    inCompare: false,
  },
};

const dateRange = {
  checkInIso: "2026-08-10",
  checkOutIso: "2026-08-12",
  labelKo: "2박",
};

const steps = buildPrepareChecklist({
  object,
  dateRange,
  guestCount: 2,
  price: { amountWon: 120_000, labelKo: "120,000원" },
});

assert.equal(steps.length, 3);
assert.ok(steps.every((s) => s.done));
assert.deepEqual(
  steps.map((s) => s.id),
  ["info", "candidate", "conditions"],
);

const draft = createReservationDraft({
  contextId: "ctx_1",
  object,
  dateRange,
  guestCount: 2,
  price: { amountWon: 120_000, labelKo: "120,000원" },
});

assert.equal(draft.status, "draft");
assert.equal(draft.objectId, "hotel_123");
assert.equal(draft.guestCount, 2);
assert.equal(draft.price.amountWon, 120_000);
assert.equal(draft.dateRange.checkInIso, "2026-08-10");

writeReservationDraft(draft);
assert.equal(readReservationDraft("ctx_1", "hotel_123")?.draftId, draft.draftId);

assert.throws(() => assertPrepareDoesNotCommit("commit"));
assertPrepareDoesNotCommit("prepare");

clearReservationDraft("ctx_1");
assert.equal(readReservationDraft("ctx_1", "hotel_123"), null);

console.log(
  "ok reservation-draft",
  draft.status,
  draft.dateRange.labelKo,
  `guests=${draft.guestCount}`,
  draft.price.labelKo,
);
