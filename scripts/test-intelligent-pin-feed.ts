#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { buildInfiniteDiscoveryFeedCards } from "../lib/globe/intelligent-pin/build-infinite-discovery-feed-cards";
import type { GlobeResourceReelItem } from "../lib/globe/resource-reel/types";
import type { EventCandidate } from "../lib/events/event-candidate";

const event = {
  id: "evt-intelligent-pin",
  title: "오사카",
  place: "오사카",
} as EventCandidate;

const items: GlobeResourceReelItem[] = [
  {
    resourceId: "evt-intelligent-pin:lodging:hotel-a",
    kind: "lodging",
    placeId: "hotel-a",
    title: "호텔 A",
    score100: 90,
    detailReasonLine: "가까워요",
    accent: "green",
    thumbnailUrl: null,
    lat: 34.7,
    lng: 135.5,
    carouselIndex: 0,
    secondaryLine: "₩120,000",
  },
  {
    resourceId: "evt-intelligent-pin:eatery:cafe-b",
    kind: "eatery",
    placeId: "cafe-b",
    title: "카페 B",
    score100: 86,
    detailReasonLine: "분위기 좋아요",
    accent: "orange",
    thumbnailUrl: null,
    lat: 34.71,
    lng: 135.51,
    carouselIndex: 1,
  },
  {
    resourceId: "evt-intelligent-pin:activity:park-c",
    kind: "activity",
    placeId: "park-c",
    title: "공원 C",
    score100: 84,
    detailReasonLine: "산책하기 좋아요",
    accent: "purple",
    thumbnailUrl: null,
    lat: 34.72,
    lng: 135.52,
    carouselIndex: 2,
    activitySubtype: "park",
  },
];

const cards = buildInfiniteDiscoveryFeedCards({ event, items });
assert.equal(cards.length, 3);
assert.equal(cards[0]?.kind, "lodging");
assert.equal(cards[1]?.kind, "eatery");
assert.equal(cards[2]?.kind, "activity");
assert.equal(cards[0]?.transaction.canCheckout, false);
assert.equal(cards[0]?.state.capsuleState, "exploring");

console.log("test-intelligent-pin-feed: ok");
