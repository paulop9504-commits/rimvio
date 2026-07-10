/**
 * Hub action timeline + merged recall from session log.
 */

import assert from "node:assert/strict";
import { summarizeContextRecall } from "../lib/globe/context-hub/summarize-context-recall";
import { buildHubActionTimelineRows } from "../lib/globe/resource/format-hub-action-timeline";
import { createPurchaseAction, createReserveAction } from "../lib/globe/resource/hub-action-record";
import type { EventCandidate } from "../lib/events/event-candidate";

const event = {
  id: "ctx-osaka",
  title: "오사카",
  category: "travel",
  source: "user",
  lifecycle: "active",
  datetime: "2026-07-16T00:00:00.000Z",
  place: "오사카",
  description: null,
  confidence: 1,
  lifecycleUpdatedAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  metadata: {},
} as unknown as EventCandidate;

const reserve = createReserveAction({
  contextEventId: event.id,
  resourceId: "ctx-osaka:lodging:lp1",
  sourceHubId: "lodging",
  approvalPolicy: "user_tap",
  status: "success",
  payload: { slot: { start: "2026-07-16", end: "2026-07-17" }, guestCount: 2 },
});

const purchase = createPurchaseAction({
  contextEventId: event.id,
  resourceId: "ctx-osaka:lodging:lp1",
  sourceHubId: "lodging",
  approvalPolicy: "user_tap",
  status: "success",
  payload: { amount: 120_000, currency: "KRW" },
});

const summary = summarizeContextRecall(event, [reserve, purchase]);
assert.equal(summary.hasLodging, true);
assert.equal(summary.confirmedCount, 1);

const timeline = buildHubActionTimelineRows([reserve, purchase]);
assert.equal(timeline.length, 2);
assert.equal(timeline[0]?.labelKo, "숙소 결제");
assert.equal(timeline[1]?.labelKo, "숙소 확보");

console.log("test-hub-action-timeline: ok");
