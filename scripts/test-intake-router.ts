import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import {
  buildIntakeContext,
  resolveIntakeOffer,
  TRIP_INTAKE_DOMAIN_ID,
  LODGING_INTAKE_DOMAIN_ID,
} from "../lib/intake";

const emptyEvent = {
  id: "evt-intake-router",
  title: "여행",
  datetime: "2026-07-10T00:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  metadata: {},
} as unknown as EventCandidate;

const tripOffer = resolveIntakeOffer(
  buildIntakeContext({
    contextEventId: emptyEvent.id,
    message: "오사카 7일, 초행 잘 부탁",
    event: emptyEvent,
  }),
);
assert.equal(tripOffer?.domainId, TRIP_INTAKE_DOMAIN_ID);

const lodgingOffer = resolveIntakeOffer(
  buildIntakeContext({
    contextEventId: emptyEvent.id,
    message: "호텔 예약 2박",
    event: emptyEvent,
  }),
);
assert.equal(lodgingOffer?.domainId, LODGING_INTAKE_DOMAIN_ID);

const instantLodging = resolveIntakeOffer(
  buildIntakeContext({
    contextEventId: emptyEvent.id,
    message: "주변 호텔",
    event: emptyEvent,
  }),
);
assert.equal(instantLodging, null);

console.log("test-intake-router: ok");
