import assert from "node:assert/strict";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import {
  CONTEXT_HUB_ACTION_LOG_META_KEY,
  readDurableHubActionLog,
  readHubActionLogFromEvent,
} from "../lib/globe/resource/context-hub-action-log-metadata";
import {
  clearHubActionLog,
  emitHubActionRecord,
  emitSearchHubAction,
  readHubActionLog,
} from "../lib/globe/resource/hub-action-record-store";
import {
  createPurchaseAction,
  createReserveAction,
} from "../lib/globe/resource/hub-action-record";
import { findLifeEventCandidate } from "../lib/life-read-model";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";

resetEventCandidatesForTests([]);

const CTX = "evt-durable-hub-action";
const stamp = new Date().toISOString();

commitEventUpsert({
  id: CTX,
  title: "제주 여행",
  category: "travel",
  source: "manual",
  lifecycle: "active",
  datetime: stamp,
  place: "제주",
  confidence: 0.9,
  lifecycleUpdatedAt: stamp,
  createdAt: stamp,
  updatedAt: stamp,
  metadata: {},
});

clearHubActionLog(CTX);

const search = emitSearchHubAction({
  contextEventId: CTX,
  sourceHubId: "hub.onboarding_parallel",
  payload: { query: "제주 숙소" },
});
assert.equal(search.ok, true);
if (!search.ok) throw new Error("search failed");
assert.equal(search.durable, true);

const resourceId = `${CTX}:lodging:place-1`;
const reserve = emitHubActionRecord(
  createReserveAction({
    contextEventId: CTX,
    resourceId,
    status: "success",
    payload: { slot: { start: "2026-08-01", end: "2026-08-03" } },
  }),
);
assert.equal(reserve.ok, true);
if (!reserve.ok) throw new Error("reserve failed");
assert.equal(reserve.durable, true);

const purchase = emitHubActionRecord(
  createPurchaseAction({
    contextEventId: CTX,
    resourceId,
    status: "success",
    externalRef: "PAY-1",
    payload: { amount: 99000, currency: "KRW" },
  }),
);
assert.equal(purchase.ok, true);
if (!purchase.ok) throw new Error("purchase failed");
assert.equal(purchase.durable, true);

const event = findLifeEventCandidate(CTX);
assert.ok(event);
const metaRows = event!.metadata?.[CONTEXT_HUB_ACTION_LOG_META_KEY];
assert.ok(Array.isArray(metaRows));
assert.equal((metaRows as unknown[]).length, 3);

const fromEvent = readHubActionLogFromEvent(event);
assert.deepEqual(
  fromEvent.map((row) => row.type),
  ["search", "reserve", "purchase"],
);
assert.equal(readDurableHubActionLog(CTX).length, 3);
assert.equal(readHubActionLog(CTX).length, 3);

// Context missing → session-only path (not durable).
const ghost = emitSearchHubAction({
  contextEventId: "evt-missing-context",
  payload: { query: "ghost" },
});
assert.equal(ghost.ok, true);
if (!ghost.ok) throw new Error("ghost search failed");
assert.equal(ghost.durable, false);

clearHubActionLog(CTX);
clearHubActionLog("evt-missing-context");
assert.equal(readHubActionLog(CTX).length, 0);
assert.equal(
  findLifeEventCandidate(CTX)?.metadata?.[CONTEXT_HUB_ACTION_LOG_META_KEY],
  undefined,
);

console.log("test-hub-action-durable-log: ok");
