import assert from "node:assert/strict";
import { resolveOperatorAskChipDomain } from "../lib/globe/flight-prep/resolve-flight-ask-chip-domain";
import { planOneShotFlightPrep } from "../lib/globe/flight-prep/plan-one-shot-flight-prep";
import { appendEngineEventToMetadata, readEngineEventsFromMetadata } from "../lib/engine/engine-event-metadata";

assert.equal(
  resolveOperatorAskChipDomain({
    pendingTrigger: "제주 항공권 예약 준비해",
    planReason: "trip_intake_gap",
  }),
  "flight_prep",
);

assert.equal(
  resolveOperatorAskChipDomain({
    pendingTrigger: "부산 숙소 예약 준비해",
    planReason: "trip_intake_gap",
  }),
  "trip_intake",
);

const readyPlan = planOneShotFlightPrep({
  message: "서울에서 제주 항공권 예약 7월 11일",
  event: {
    id: "evt-flight-ready",
    title: "제주",
    datetime: "2026-07-11",
    lifecycle: "active",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    metadata: {
      contextTripOriginLabel: "서울",
      planWindowEndIso: "2026-07-12",
      contextLodgingGuestCount: 1,
      feedPlanEnabled: true,
    },
  } as never,
});
assert.equal(readyPlan?.readyForHub, true);

const metadata = appendEngineEventToMetadata({
  metadata: {},
  engineId: "flight_booking",
  kind: "main_selected",
  executionNodeId: "departure",
  payload: { provider: "naver_flight" },
});
const events = readEngineEventsFromMetadata(metadata);
assert.equal(events[0]?.engineId, "flight_booking");
assert.equal(events[0]?.executionNodeId, "departure");

console.log("test-flight-prep-flow: ok");
