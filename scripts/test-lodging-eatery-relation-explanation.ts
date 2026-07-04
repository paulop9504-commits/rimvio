#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { describeLodgingEateryRelation } from "../lib/globe/relation/describe-lodging-eatery-relation";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";

resetEventCandidatesForTests([]);

const event = commitEventUpsert({
  id: "test-lodging-eatery-relation",
  title: "후쿠오카 여행",
  category: "travel",
  source: "manual",
  lifecycle: "planned",
  datetime: "2026-07-10T15:00:00.000Z",
  place: "후쿠오카",
  confidence: 0.92,
  metadata: {
    feedPlanEnabled: true,
    planWindowEndIso: "2026-07-13T11:00:00.000Z",
    planNights: 3,
  },
  lifecycleUpdatedAt: "2026-07-01T09:00:00.000Z",
  createdAt: "2026-07-01T09:00:00.000Z",
  updatedAt: "2026-07-01T09:00:00.000Z",
});

const lodgingRows = [
  {
    placeId: "hakata-stay",
    name: "하카타 스테이",
    lat: 33.5899,
    lng: 130.4206,
    images: [],
    partnerLabel: "하카타역 도보 6분",
    provider: "mock" as const,
    photoSource: "mock" as const,
    photoConfidence: "mock" as const,
  },
];

const firstNight = describeLodgingEateryRelation({
  event,
  lodgingRows,
  eatery: {
    placeId: "yatai-dinner",
    name: "나카스 야타이",
    lat: 33.5925,
    lng: 130.4129,
    images: [],
    address: "후쿠오카 나카스",
    cuisineHint: "로컬 포차",
    provider: "mock",
    providerLabel: "Mock",
  },
  now: new Date("2026-07-10T18:00:00.000Z"),
});

assert.ok(firstNight, "expected a lodging relation summary on check-in day");
assert.equal(firstNight?.stayPhase, "check_in_day");
assert.match(firstNight?.badgeLabelKo ?? "", /도보/u);
assert.match(firstNight?.summaryKo ?? "", /첫날 저녁/u);
assert.match(firstNight?.stayWindowLabelKo ?? "", /7월/u);

const checkoutDay = describeLodgingEateryRelation({
  event,
  lodgingRows,
  eatery: {
    placeId: "airport-brunch",
    name: "공항 가는 길 식당",
    lat: 33.6001,
    lng: 130.4015,
    images: [],
    address: "후쿠오카 공항 방향",
    categoryLabel: "정식",
    provider: "mock",
    providerLabel: "Mock",
  },
  now: new Date("2026-07-13T08:30:00.000Z"),
});

assert.ok(checkoutDay, "expected a lodging relation summary on checkout day");
assert.equal(checkoutDay?.stayPhase, "checkout_day");
assert.match(checkoutDay?.badgeLabelKo ?? "", /차로/u);
assert.match(checkoutDay?.summaryKo ?? "", /체크아웃날/u);

console.log("test-lodging-eatery-relation-explanation: ok");
