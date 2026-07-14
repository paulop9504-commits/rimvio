import assert from "node:assert/strict";
import type { ContextConditionRecommendation } from "../lib/globe/context-condition-ai/local-discovery-action-types";
import { applyTripExperienceMainLegsMetadata } from "../lib/globe/trip-experience/apply-trip-experience-main-legs-metadata";
import { readTripExperienceMainLegPlaceIds } from "../lib/globe/trip-experience/read-trip-experience-main-legs";
import { resolveTripExperienceMainByLeg } from "../lib/globe/trip-experience/resolve-trip-experience-main-by-leg";
import {
  CONTEXT_TRIP_EXPERIENCE_MAIN_LEGS_META_KEY,
  isTripExperienceScoutBatchId,
} from "../lib/globe/trip-experience/trip-experience-main-leg-types";
import type { EventCandidate } from "../lib/events/event-candidate";

function rec(
  kind: ContextConditionRecommendation["kind"],
  placeId: string,
  rank: number,
): ContextConditionRecommendation {
  return {
    kind,
    title: `${kind}-${placeId}`,
    reasonKo: "test",
    rank,
    placeId,
    lat: 35.1,
    lng: 129.0,
  };
}

const recommendations = [
  rec("lodging", "lodging-a", 2),
  rec("lodging", "lodging-b", 1),
  rec("eatery", "eatery-a", 3),
  rec("eatery", "eatery-b", 1),
  rec("activity", "activity-a", 2),
  rec("activity", "activity-b", 1),
];

const mains = resolveTripExperienceMainByLeg(recommendations, [
  "lodging",
  "eatery",
  "activity",
]);
assert.equal(mains.lodging?.placeId, "lodging-b");
assert.equal(mains.eatery?.placeId, "eatery-b");
assert.equal(mains.activity?.placeId, "activity-b");

assert.equal(isTripExperienceScoutBatchId("trip-xp-lodging-eatery"), true);
assert.equal(isTripExperienceScoutBatchId("batch-123"), false);

const stamp = "2026-07-10T12:00:00.000Z";
const metadata = applyTripExperienceMainLegsMetadata({
  metadata: {},
  primaryLeg: "eatery",
  legs: {
    lodging: {
      kind: "lodging",
      resourceId: "evt:lodging:lodging-b",
      placeId: "lodging-b",
      label: "숙소 B",
      pinnedAtIso: stamp,
    },
    eatery: {
      kind: "eatery",
      resourceId: "evt:eatery:eatery-b",
      placeId: "eatery-b",
      label: "맛집 B",
      pinnedAtIso: stamp,
    },
    activity: {
      kind: "activity",
      resourceId: "evt:activity:activity-b",
      placeId: "activity-b",
      label: "놀거리 B",
      pinnedAtIso: stamp,
    },
  },
});

assert.ok(metadata.contextTripExperienceMainLegsV1);
assert.equal(metadata.contextLodgingPinnedPlaceId, "lodging-b");
assert.equal(metadata.contextEateryPinnedPlaceId, "eatery-b");
assert.equal(
  (metadata[CONTEXT_TRIP_EXPERIENCE_MAIN_LEGS_META_KEY] as { primaryKind: string })
    .primaryKind,
  "eatery",
);

const event = {
  id: "evt-main",
  metadata,
} as unknown as EventCandidate;
const placeIds = readTripExperienceMainLegPlaceIds(event);
assert.equal(placeIds.lodging, "lodging-b");
assert.equal(placeIds.eatery, "eatery-b");
assert.equal(placeIds.activity, "activity-b");

console.log("test-trip-experience-main-commit: ok");
