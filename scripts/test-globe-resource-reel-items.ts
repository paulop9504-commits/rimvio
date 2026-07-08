#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { buildGlobeResourceReelItems } from "../lib/globe/resource-reel/build-globe-resource-reel-items";
import { writeContextConditionLastBatch } from "../lib/globe/context-condition-ai/context-condition-last-batch-store";
import {
  CONTEXT_EATERY_HUB_ENABLED_META_KEY,
  CONTEXT_EATERY_INVENTORY_META_KEY,
} from "../lib/globe/eatery/eatery-resource-types";
import { CONTEXT_LODGING_HUB_ENABLED_META_KEY } from "../lib/globe/context-hub/lodging-resource-types";
import { CONTEXT_LODGING_INVENTORY_META_KEY } from "../lib/globe/context-hub/lodging-resource-types";

const event: EventCandidate = {
  id: "trip-tokyo",
  title: "도쿄",
  place: "도쿄",
  datetime: "2026-07-12T00:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  metadata: {
    [CONTEXT_LODGING_HUB_ENABLED_META_KEY]: true,
    [CONTEXT_LODGING_INVENTORY_META_KEY]: [
      {
        placeId: "hotel-a",
        name: "사쿠라 호텔",
        lat: 35.68,
        lng: 139.76,
        images: ["https://example.com/a.jpg"],
        priceKrw: 85000,
      },
      {
        placeId: "hotel-b",
        name: "시부야 호텔",
        lat: 35.66,
        lng: 139.7,
        images: ["https://example.com/b.jpg"],
        priceKrw: 120000,
      },
    ],
  },
};

const items = buildGlobeResourceReelItems(event);
assert.equal(items.length, 2);
assert.equal(items[0]?.placeId, "hotel-a");
assert.equal(items[0]?.kind, "lodging");
assert.equal(items[0]?.secondaryLine, "₩85,000");

console.log("test-globe-resource-reel-items: ok");

const storage = new Map<string, string>();
Object.assign(globalThis, {
  window: {},
  sessionStorage: {
    getItem(key: string) {
      return storage.has(key) ? storage.get(key)! : null;
    },
    setItem(key: string, value: string) {
      storage.set(key, value);
    },
    removeItem(key: string) {
      storage.delete(key);
    },
  },
});

const activityEvent: EventCandidate = {
  ...event,
  id: "trip-osaka",
  place: "오사카",
  metadata: {
    [CONTEXT_EATERY_HUB_ENABLED_META_KEY]: true,
    [CONTEXT_EATERY_INVENTORY_META_KEY]: [
      {
        placeId: "mall-1",
        name: "난바 시티",
        lat: 34.664,
        lng: 135.501,
        images: ["https://example.com/mall.jpg"],
        rating: 4.4,
        openNow: true,
      },
    ],
  },
};

writeContextConditionLastBatch(activityEvent.id, {
  batchId: "batch-activity",
  count: 1,
  summaryKo: "쇼핑 1곳을 지도에 표시했어요",
  atIso: "2026-07-01T00:00:00.000Z",
  recommendations: [
    {
      kind: "activity",
      activitySubtype: "shopping",
      title: "난바 시티",
      reasonKo: "쇼핑 의도와 맞는 장소예요",
      placeId: "mall-1",
      lat: 34.664,
      lng: 135.501,
    },
  ],
});

const activityItems = buildGlobeResourceReelItems(activityEvent);
assert.equal(activityItems.length, 1);
assert.equal(activityItems[0]?.kind, "activity");
assert.equal(activityItems[0]?.activitySubtype, "shopping");
assert.equal(activityItems[0]?.secondaryLine, "쇼핑 · 평점 4.4 · 영업 중");
assert.equal(activityItems[0]?.actionLabel, "매장 길찾기");

console.log("test-globe-resource-reel-items: activity subtype ok");
