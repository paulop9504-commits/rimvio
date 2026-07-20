#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildObjectCardModel,
  buildRealityObject,
  OBJECT_CARD_TABS,
  resolveRealityObjectForCard,
} from "../lib/reality-object";
import type { EventCandidate } from "../lib/events/event-candidate";

const object = buildRealityObject({
  contextEventId: "ctx-osaka",
  title: "Ichiran Namba",
  placeId: "maps:ichiran",
  resourceId: "ctx-osaka:eatery:ramen",
  pinKind: "eatery",
  categoryLabel: "라멘",
  coverImageUrl: "https://cdn.example.com/ramen-food-bowl.jpg",
  images: [
    "https://cdn.example.com/ramen-food-bowl.jpg",
    "https://cdn.example.com/ramen-interior.jpg",
  ],
  openingHours: "11:00–22:00",
  phone: "+81-6-0000-0000",
  reservationSupport: true,
  rating: 4.5,
  lat: 34.66,
  lng: 135.5,
});

const model = buildObjectCardModel({
  object,
  title: object.title,
  pinKind: "eatery",
  nearby: [
    {
      id: "m:hotel",
      label: "Hilton",
      pinKind: "lodging",
      score: 0.89,
    },
  ],
  executionReady: true,
});

assert.equal(model.title, "Ichiran Namba");
assert.ok(model.facts.some((f) => f.id === "hours"));
assert.ok(model.facts.some((f) => f.id === "phone"));
assert.ok(model.galleryUrls.length >= 1);
assert.equal(model.nearby.length, 1);
assert.equal(model.nearby[0]!.label, "Hilton");
assert.ok(model.capabilities.includes("reserve"));
assert.ok(model.capabilities.includes("add_to_inbox"));
assert.equal(model.executionReady, true);
assert.equal(model.defaultTab, "execution");
assert.equal(OBJECT_CARD_TABS.length, 4);

const locked = buildObjectCardModel({
  object,
  title: object.title,
  pinKind: "eatery",
  executionReady: false,
});
assert.equal(locked.defaultTab, "information");

const fallback = buildObjectCardModel({
  title: "Osaka Castle",
  pinKind: "activity",
  coverImageUrl: "https://cdn.example.com/osaka-castle.jpg",
  nearby: [],
  executionReady: true,
});
assert.equal(fallback.title, "Osaka Castle");
assert.equal(fallback.galleryUrls[0], "https://cdn.example.com/osaka-castle.jpg");
assert.ok(fallback.capabilities.includes("navigate"));

const event = {
  id: "ctx-osaka",
  metadata: {
    realityObjectsV1: [object],
    realityObjectPrimaryId: object.id,
  },
} as unknown as EventCandidate;

const resolved = resolveRealityObjectForCard({
  event,
  resourceId: "ctx-osaka:eatery:ramen",
});
assert.ok(resolved);
assert.equal(resolved!.title, "Ichiran Namba");

const byPlace = resolveRealityObjectForCard({
  event,
  placeId: "maps:ichiran",
});
assert.ok(byPlace);
assert.equal(byPlace!.id, object.id);

console.log("test-object-card: ok");
