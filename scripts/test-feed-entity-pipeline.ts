import assert from "node:assert/strict";
import { classifyDiscoveryEntityQuery } from "../lib/globe/feed-entity/classify-discovery-entity-query";
import { readEntityDataSchema } from "../lib/globe/feed-entity/entity-data-schemas";
import { buildFeedEntityProfile } from "../lib/globe/feed-entity/build-feed-entity-profile";

const restaurant = classifyDiscoveryEntityQuery("오사카 도톤보리 라면 맛집");
assert.equal(restaurant.entityKind, "restaurant");
assert.equal(restaurant.location, "오사카");

const hotel = classifyDiscoveryEntityQuery("오사카 난바 호텔");
assert.equal(hotel.entityKind, "hotel");

const cafe = classifyDiscoveryEntityQuery("조용한 카페");
assert.equal(cafe.entityKind, "cafe");

const schema = readEntityDataSchema("restaurant");
assert.ok(schema.priorityOrder.includes("food_photos"));
assert.ok(schema.reviewCategories.includes("taste"));

const profile = buildFeedEntityProfile({
  event: {
    id: "evt-feed-entity-test",
    title: "오사카",
    category: "travel",
    source: "manual",
    lifecycle: "planned",
    datetime: new Date().toISOString(),
    place: "오사카",
    description: "",
    metadata: {},
    confidence: 0.9,
    lifecycleUpdatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  item: {
    resourceId: "res-1",
    kind: "eatery",
    placeId: "p1",
    lat: 34.6687,
    lng: 135.5013,
    title: "라멘 이치란",
    detailReasonLine: "국물이 진한 편",
    score100: 82,
    thumbnailUrl: null,
    secondaryLine: null,
    actionLabel: null,
    activitySubtype: null,
  },
  imageCount: 3,
  triggerMessage: "오사카 라면 맛집",
  userIntentKo: "라면 맛집",
});

assert.equal(profile.entityKind, "restaurant");
assert.ok(profile.prioritySlots.length >= 5);
assert.ok(profile.dataCompletenessPercent > 0);
assert.ok(profile.practicalTipsKo.length >= 1);

console.log("test-feed-entity-pipeline: ok");
