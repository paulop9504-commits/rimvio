#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resetEventCandidatesForTests } from "@/lib/events/event-store";
import {
  isInstantLodgingSearch,
  requiresLodgingBookingSlots,
} from "../lib/globe/context-condition-ai/instant-lodging-search";
import {
  pinContextConditionRecommendation,
  readContextConditionPinnedPlaceIds,
} from "../lib/globe/context-condition-ai/pin-context-condition-recommendation";
import { commitEateryInventoryToEvent } from "@/lib/globe/eatery/commit-eatery-inventory";
import { readPinnedContextItem } from "@/lib/globe/context-pinned-item";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

assert.equal(isInstantLodgingSearch("주변 호텔 보여줘"), true);
assert.equal(isInstantLodgingSearch("근처 숙소"), true);
assert.equal(requiresLodgingBookingSlots("호텔 예약해줘"), true);
assert.equal(requiresLodgingBookingSlots("주변 호텔"), false);

const storage = new Map<string, string>();
const localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
};
Object.assign(globalThis, {
  localStorage,
  window: {
    localStorage,
    dispatchEvent: () => true,
  },
});

resetEventCandidatesForTests();

const eventId = "evt-agent-scout-pin";
const stamp = new Date().toISOString();
const baseEvent = commitEventUpsert({
  id: eventId,
  title: "Osaka",
  category: "travel",
  source: "manual",
  lifecycle: "active",
  datetime: stamp,
  place: "Osaka",
  description: null,
  confidence: 0.9,
  createdAt: stamp,
  updatedAt: stamp,
  metadata: {},
});

commitEateryInventoryToEvent({
  event: baseEvent,
  inventory: [
    {
      placeId: "disney-1",
      name: "Tokyo Disneyland",
      lat: 35.6329,
      lng: 139.8804,
      images: [],
      categoryLabel: "테마파크",
    },
  ],
  inventorySource: "google_places",
  recommendScores: {},
});

assert.ok(findLifeEventCandidate(eventId));

const pinned = pinContextConditionRecommendation({
  eventId,
  recommendation: {
    kind: "activity",
    placeId: "disney-1",
    title: "Tokyo Disneyland",
  },
});

const pinnedIds = readContextConditionPinnedPlaceIds(pinned);
assert.equal(pinnedIds.activity, "disney-1");
assert.equal(pinnedIds.eatery, null);

const pinnedItem = readPinnedContextItem(pinned);
assert.equal(pinnedItem?.kind, "activity");
assert.ok(pinnedItem?.resourceId.includes(":activity:disney-1"));

console.log("test-context-agent-scout-pin: ok");
