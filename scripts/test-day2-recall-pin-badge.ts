/**
 * Day 2 recall — cold start after session hub log is cleared.
 * Durable contextHubActionLog on EventCandidate → pin recall badge.
 */

import assert from "node:assert/strict";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { enrichGlobePinRecallBadges } from "../lib/globe/enrich-globe-pin-recall-badge";
import {
  formatContextRecallBadgeLabel,
  summarizeContextRecall,
} from "../lib/globe/context-hub/summarize-context-recall";
import { projectPinClusterClassifiedPin } from "../lib/globe/project-pin-clusters";
import type { PinCluster } from "../lib/globe/pin-cluster-types";
import {
  CONTEXT_HUB_ACTION_LOG_META_KEY,
  readHubActionLogFromEvent,
} from "../lib/globe/resource/context-hub-action-log-metadata";
import {
  clearHubActionLog,
  emitHubActionRecord,
  readHubActionLog,
} from "../lib/globe/resource/hub-action-record-store";
import {
  createPurchaseAction,
  createReserveAction,
} from "../lib/globe/resource/hub-action-record";
import { findLifeEventCandidate } from "../lib/life-read-model";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";

const EVENT_ID = "evt-day2-tokyo";
const RESOURCE_ID = `${EVENT_ID}:lodging:liteapi:lp1`;
const stamp = "2026-07-10T00:00:00.000Z";

resetEventCandidatesForTests([]);

const purchase = createPurchaseAction({
  contextEventId: EVENT_ID,
  resourceId: RESOURCE_ID,
  sourceHubId: "lodging",
  approvalPolicy: "user_tap",
  status: "success",
  payload: { amount: 120_000, currency: "KRW", confirmationCode: "E2E-DAY2" },
});

const reserve = createReserveAction({
  contextEventId: EVENT_ID,
  resourceId: RESOURCE_ID,
  sourceHubId: "lodging",
  approvalPolicy: "user_tap",
  status: "success",
  payload: {
    slot: { start: "2026-07-18", end: "2026-07-21" },
    guestCount: 2,
  },
});

commitEventUpsert({
  id: EVENT_ID,
  title: "도쿄 여행",
  category: "travel",
  source: "manual",
  lifecycle: "active",
  datetime: "2026-07-18T15:00:00.000Z",
  place: "도쿄",
  confidence: 1,
  lifecycleUpdatedAt: stamp,
  createdAt: stamp,
  updatedAt: stamp,
  metadata: {
    feedPlanEnabled: true,
    tripLeg: "destination",
    tripRef: "trip-day2-tokyo",
    planWindowEndIso: "2026-07-21T11:00:00.000Z",
    contextLodgingPinnedResourceId: RESOURCE_ID,
    contextLodgingHubEnabled: true,
    [CONTEXT_HUB_ACTION_LOG_META_KEY]: [reserve, purchase],
  },
});

const event = findLifeEventCandidate(EVENT_ID);
assert.ok(event, "event persisted");

// Simulate Day 2: session hub log empty, durable metadata only.
clearHubActionLog(EVENT_ID);
assert.equal(readHubActionLog(EVENT_ID).length, 0, "session log cleared on restart");

const durableOnly = readHubActionLogFromEvent(event);
assert.equal(durableOnly.length, 2, "durable log survives restart");

const summary = summarizeContextRecall(event);
assert.equal(summary.hasLodging, true);
assert.equal(summary.confirmedCount, 1);
assert.equal(formatContextRecallBadgeLabel(summary), "확정 1건");

const cluster: PinCluster = {
  pinId: "pin-day2-tokyo",
  eventId: EVENT_ID,
  title: "도쿄",
  placeLabel: "도쿄",
  lat: 35.6762,
  lng: 139.6503,
  dateLabel: null,
  startedAtIso: stamp,
  recallLine: null,
  evidence: {
    photoCount: 0,
    videoCount: 0,
    chatCount: 0,
    placePinCount: 0,
  },
};

const eventsById = new Map([[EVENT_ID, event]]);
const pin = projectPinClusterClassifiedPin(cluster, event);
assert.equal(pin.tripLeg, "destination");

const [enriched] = enrichGlobePinRecallBadges([pin], eventsById);
assert.equal(enriched?.recallBadgeLabel, "확정 1건", "destination pin shows Day 2 recall");

console.log("test-day2-recall-pin-badge: ok");
