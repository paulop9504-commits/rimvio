import assert from "node:assert/strict";
import { resolveLodgingPrepMainRecommendation } from "../lib/globe/lodging-prep/resolve-lodging-prep-main-recommendation";
import { isLodgingPrepUtterance } from "../lib/globe/lodging-prep/is-lodging-prep-utterance";
import { planOneShotLodgingPrep } from "../lib/globe/lodging-prep/plan-one-shot-lodging-prep";
import type { EventCandidate } from "../lib/events/event-candidate";

const northStar =
  "지금 출장중인데 부산 서면쪽 숙소 예약 준비해";

assert.equal(isLodgingPrepUtterance(northStar), true);
assert.equal(isLodgingPrepUtterance("부산 서면쪽 숙소 예약 준비해"), true);

const event = {
  id: "evt-agent",
  title: "부산 출장",
  place: "부산",
  datetime: "2026-07-10T00:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  metadata: {
    contextTripOriginLabel: "부산",
    contextTripBudgetBand: "balanced",
  },
} as unknown as EventCandidate;

const plan = planOneShotLodgingPrep({
  message: northStar,
  event,
  userLat: 35.158,
  userLng: 129.059,
  now: new Date("2026-07-10T12:00:00+09:00"),
});
assert.ok(plan);
assert.equal(plan!.readyForScout, true);

const main = resolveLodgingPrepMainRecommendation([
  {
    kind: "eatery",
    title: "맛집",
    reasonKo: "test",
    rank: 1,
    placeId: "e1",
    lat: 35.15,
    lng: 129.05,
  },
  {
    kind: "lodging",
    title: "서면역 호텔",
    reasonKo: "출장",
    rank: 2,
    placeId: "h1",
    lat: 35.1579,
    lng: 129.059,
  },
]);
assert.equal(main?.placeId, "h1");

console.log("test-agent-one-shot-integration: ok");
