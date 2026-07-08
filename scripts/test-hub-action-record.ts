import assert from "node:assert/strict";
import {
  createCancelAction,
  createPurchaseAction,
  createReserveAction,
  createSearchAction,
} from "../lib/globe/resource/hub-action-record";
import {
  clearHubActionLog,
  emitHubActionRecord,
  emitSearchHubAction,
  readHubActionLog,
} from "../lib/globe/resource/hub-action-record-store";

const CTX = "evt-hub-action-test";

clearHubActionLog(CTX);

const search = emitSearchHubAction({
  contextEventId: CTX,
  sourceHubId: "hub.lodging",
  payload: { query: "제주 숙소" },
});
assert.equal(search.ok, true);
if (!search.ok) throw new Error("search emit failed");
assert.equal(search.action.resourceId, null);
assert.equal(search.action.type, "search");

const badSearch = emitHubActionRecord({
  ...createSearchAction({
    contextEventId: CTX,
    payload: { query: "x" },
  }),
  resourceId: "should-not",
} as ReturnType<typeof createSearchAction>);
assert.equal(badSearch.ok, false);
if (badSearch.ok) throw new Error("expected fail");
assert.equal(badSearch.reason, "search_must_have_null_resource");

const reserve = emitHubActionRecord(
  createReserveAction({
    contextEventId: CTX,
    resourceId: `${CTX}:lodging:place-1`,
    sourceHubId: "hub.lodging",
    status: "success",
    externalRef: "CONF-001",
    payload: {
      slot: { start: "2026-08-01", end: "2026-08-03" },
      guestCount: 2,
    },
  }),
);
assert.equal(reserve.ok, true);
if (!reserve.ok) throw new Error("reserve emit failed");

const purchase = emitHubActionRecord(
  createPurchaseAction({
    contextEventId: CTX,
    resourceId: `${CTX}:lodging:place-1`,
    status: "success",
    externalRef: "PAY-9",
    payload: { amount: 120000, currency: "KRW" },
  }),
);
assert.equal(purchase.ok, true);
if (!purchase.ok) throw new Error("purchase emit failed");

const cancel = emitHubActionRecord(
  createCancelAction({
    contextEventId: CTX,
    resourceId: `${CTX}:lodging:place-1`,
    supersedesActionId: reserve.action.actionId,
    status: "success",
    payload: { reason: "user_cancel" },
  }),
);
assert.equal(cancel.ok, true);
if (!cancel.ok) throw new Error("cancel emit failed");

const dup = emitHubActionRecord(search.action);
assert.equal(dup.ok, false);
if (dup.ok) throw new Error("expected dup fail");
assert.equal(dup.reason, "action_id_already_exists");

const orphanCancel = emitHubActionRecord(
  createCancelAction({
    contextEventId: CTX,
    resourceId: `${CTX}:lodging:place-1`,
    supersedesActionId: "missing-action",
    payload: {},
  }),
);
assert.equal(orphanCancel.ok, false);

const log = readHubActionLog(CTX);
assert.equal(log.length, 4);
assert.deepEqual(
  log.map((row) => row.type),
  ["search", "reserve", "purchase", "cancel"],
);

clearHubActionLog(CTX);
assert.equal(readHubActionLog(CTX).length, 0);

console.log("test-hub-action-record: ok");
