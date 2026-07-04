import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { shouldOfferTravelPaceLearn } from "../lib/globe/travel/should-offer-travel-pace-learn";
import type { WorkQueueItem } from "../lib/work-queue";

const travelEvent: EventCandidate = {
  id: "evt-travel-1",
  category: "travel",
  title: "정성이랑 여행",
  place: "오사카",
  source: "message",
  lifecycle: "active",
  confidence: 0.9,
  lifecycleUpdatedAt: "2026-07-04T00:00:00.000Z",
  createdAt: "2026-07-04T00:00:00.000Z",
  updatedAt: "2026-07-04T00:00:00.000Z",
};

const travelWorkItem: WorkQueueItem = {
  id: "q-travel",
  graphId: "g1",
  kind: "travel_context",
  surface: "inner",
  titleKo: "여행 이어하기",
  subtitleKo: "슬롯",
  status: "slot_collect",
  seedMessage: "오사카",
  eventId: travelEvent.id,
  needsMedia: false,
  createdAt: "2026-07-04T00:00:00.000Z",
  updatedAt: "2026-07-04T00:00:00.000Z",
};

assert.equal(
  shouldOfferTravelPaceLearn({
    event: travelEvent,
    workQueue: [],
    discoveryEventId: null,
  }),
  false,
  "passive travel recall should not ask pace",
);

assert.equal(
  shouldOfferTravelPaceLearn({
    event: travelEvent,
    workQueue: [travelWorkItem],
    discoveryEventId: null,
  }),
  true,
  "travel slot collect should ask pace",
);

assert.equal(
  shouldOfferTravelPaceLearn({
    event: travelEvent,
    workQueue: [],
    discoveryEventId: travelEvent.id,
  }),
  true,
  "active discovery should ask pace",
);

assert.equal(
  shouldOfferTravelPaceLearn({
    event: travelEvent,
    workQueue: [],
    discoveryEventId: "other-event",
  }),
  false,
  "discovery for another event should not ask pace",
);

console.log("test-should-offer-travel-pace-learn: ok");
