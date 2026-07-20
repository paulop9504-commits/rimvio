#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { readPinnedContextItem } from "../lib/globe/context-pinned-item";
import {
  CONTEXT_EATERY_HUB_ENABLED_META_KEY,
  CONTEXT_EATERY_INVENTORY_META_KEY,
} from "../lib/globe/eatery/eatery-resource-types";
import { pinEaterySelectionToContext } from "../lib/globe/eatery/pin-eatery-selection-to-context";
import { pinPlaceSelectionToContext } from "../lib/globe/place/pin-place-selection-to-context";
import {
  buildRealityObject,
  capabilitiesForDiscoveryCard,
  detectRealityObjectType,
  gatePlaceInfoActionsByCapabilities,
  readPrimaryRealityObject,
  resolveRealityObjectCoverForPlace,
  resolveRealityObjectCoverUrl,
} from "../lib/reality-object";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";

// --- detect ---
assert.equal(
  detectRealityObjectType({ title: "Osaka Castle", pinKind: "activity" }),
  "landmark",
);
assert.equal(
  detectRealityObjectType({ title: "오사카 성 공원", pinKind: "activity" }),
  "landmark",
);
assert.equal(
  detectRealityObjectType({ title: "Hilton Osaka", pinKind: "lodging" }),
  "hotel",
);
assert.equal(
  detectRealityObjectType({ title: "Ichiran Ramen", pinKind: "eatery" }),
  "restaurant",
);
assert.equal(
  detectRealityObjectType({ title: "Blue Bottle", pinKind: "eatery" }),
  "cafe",
);

// --- build + capabilities ---
const castle = buildRealityObject({
  contextEventId: "ctx-osaka",
  title: "Osaka Castle",
  placeId: "place-castle",
  resourceId: "ctx-osaka:activity:place-castle",
  pinKind: "activity",
  coverImageUrl: "https://example.com/castle.jpg",
  lat: 34.6873,
  lng: 135.5262,
  city: "Osaka",
  pinnedAtIso: "2026-07-18T00:00:00.000Z",
});
assert.equal(castle.objectType, "landmark");
assert.equal(castle.coverImageUrl, "https://example.com/castle.jpg");
assert.ok(castle.execution.capabilities.includes("navigate"));
assert.ok(castle.execution.capabilities.includes("buy_ticket"));
assert.ok(castle.execution.capabilities.includes("add_to_inbox"));

const gated = gatePlaceInfoActionsByCapabilities({
  capabilities: castle.execution.capabilities,
  handlers: {
    onCall: () => undefined,
    onDirections: () => undefined,
    onReservePrep: () => undefined,
    onBookNow: () => undefined,
    onAddToExecutionInbox: () => undefined,
  },
});
assert.equal(typeof gated.onDirections, "function");
assert.equal(typeof gated.onAddToExecutionInbox, "function");
assert.equal(gated.onCall, null); // landmark has no call
assert.equal(typeof gated.onReservePrep, "function"); // buy_ticket

const activityCaps = capabilitiesForDiscoveryCard({
  kind: "activity",
  title: "오사카 성 공원",
});
assert.ok(activityCaps.includes("buy_ticket"));

// --- pin writes Reality Object + compat pin ---
resetEventCandidatesForTests([]);
const stamp = new Date().toISOString();
const event = commitEventUpsert({
  id: "test-reality-object-pin",
  title: "오사카 여행",
  category: "travel",
  source: "manual",
  lifecycle: "candidate",
  datetime: stamp,
  place: "오사카",
  confidence: 0.9,
  metadata: {
    [CONTEXT_EATERY_HUB_ENABLED_META_KEY]: true,
    [CONTEXT_EATERY_INVENTORY_META_KEY]: [
      {
        placeId: "ichiran-1",
        name: "Ichiran Ramen",
        lat: 34.66,
        lng: 135.5,
        images: ["https://example.com/ichiran.jpg"],
        provider: "google_places",
      },
    ],
  },
  lifecycleUpdatedAt: stamp,
  createdAt: stamp,
  updatedAt: stamp,
});

const pinned = pinEaterySelectionToContext({
  eventId: event.id,
  row: {
    placeId: "ichiran-1",
    name: "Ichiran Ramen",
    lat: 34.66,
    lng: 135.5,
    images: ["https://example.com/ichiran.jpg"],
    provider: "google_places",
  },
  previewUrl: "https://example.com/ichiran.jpg",
});

const primary = readPrimaryRealityObject(pinned);
assert.ok(primary);
assert.equal(primary!.objectType, "restaurant");
assert.equal(primary!.title, "Ichiran Ramen");
assert.equal(primary!.coverImageUrl, "https://example.com/ichiran.jpg");
assert.equal(
  resolveRealityObjectCoverUrl(pinned),
  "https://example.com/ichiran.jpg",
);
assert.equal(
  resolveRealityObjectCoverForPlace({
    event: pinned,
    placeId: "ichiran-1",
    fallback: "https://example.com/fallback.jpg",
  }),
  "https://example.com/ichiran.jpg",
);

const compat = readPinnedContextItem(pinned);
assert.ok(compat);
assert.equal(compat!.kind, "eatery");
assert.equal(compat!.previewUrl, "https://example.com/ichiran.jpg");

// activity / landmark pin
resetEventCandidatesForTests([]);
const activityEvent = commitEventUpsert({
  id: "test-reality-object-castle",
  title: "오사카 여행",
  category: "travel",
  source: "manual",
  lifecycle: "candidate",
  datetime: stamp,
  place: "오사카",
  confidence: 0.9,
  metadata: {},
  lifecycleUpdatedAt: stamp,
  createdAt: stamp,
  updatedAt: stamp,
});

const castlePinned = pinPlaceSelectionToContext({
  eventId: activityEvent.id,
  kind: "activity",
  row: {
    placeId: "osaka-castle",
    name: "오사카 성 공원",
    lat: 34.6873,
    lng: 135.5262,
    images: ["https://example.com/castle-cover.jpg"],
    categoryLabel: "놀거리",
  },
  previewUrl: "https://example.com/castle-cover.jpg",
});

const castleObject = readPrimaryRealityObject(castlePinned);
assert.ok(castleObject);
assert.equal(castleObject!.objectType, "landmark");
assert.equal(
  castleObject!.coverImageUrl,
  "https://example.com/castle-cover.jpg",
);
assert.equal(readPinnedContextItem(castlePinned)?.kind, "activity");

console.log("test-reality-object-engine: ok");
