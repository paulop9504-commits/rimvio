#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { resolveLodgingRankProfileFromTravelBrain } from "../lib/globe/lodging/resolve-lodging-rank-profile-from-travel-brain";
import { DEFAULT_LODGING_RANK_WEIGHTS } from "../lib/globe/lodging/lodging-rank-profile";
import { buildTravelBrainState } from "../lib/situation-projection/travel-brain-personalization";

const parentsEvent = {
  id: "evt-parents-osaka",
  title: "부모님 모시고 오사카",
  place: "오사카",
  description: "부모님과 가족 여행",
  datetime: "2026-08-01T00:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  metadata: {},
} as unknown as EventCandidate;

const parentsBrain = buildTravelBrainState(parentsEvent);
const parentsProfile = resolveLodgingRankProfileFromTravelBrain({
  travelBrain: parentsBrain,
});

assert.equal(parentsBrain.slots.lodging_priority.value, "family");
assert.equal(parentsProfile.source, "context");
assert.ok(parentsProfile.weights.quality > DEFAULT_LODGING_RANK_WEIGHTS.quality);
assert.ok(parentsProfile.reasonKo?.trim());

const businessEvent = {
  id: "evt-biz-trip",
  title: "도쿄 출장",
  place: "도쿄",
  description: "미팅 출장",
  datetime: "2026-07-10T00:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  metadata: {},
} as unknown as EventCandidate;

const businessBrain = buildTravelBrainState(businessEvent);
const businessProfile = resolveLodgingRankProfileFromTravelBrain({
  travelBrain: businessBrain,
});

assert.ok(
  businessProfile.weights.distance >= DEFAULT_LODGING_RANK_WEIGHTS.distance ||
    businessBrain.slots.lodging_priority.value === "station",
);

console.log("test-lodging-rank-profile-travel-brain: ok");
