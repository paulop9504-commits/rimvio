#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { buildGlobeResourceReelItems } from "../lib/globe/resource-reel/build-globe-resource-reel-items";
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
