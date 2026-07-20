#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  inferVisualSubject,
  representativenessStars,
  resolveMarkerVisualLod,
  resolveObjectHaloStyle,
  resolveVisualProjectionLod,
  scoreVisualCandidate,
  selectProjectionVisual,
  selectProjectionVisualUrl,
  listContextProjectionPlaceIds,
  resolveProjectionTierForPlace,
  filterMarkersByContextProjection,
} from "../lib/visual-projection";
import { buildRealityObject } from "../lib/reality-object";
import { upsertRealityObjectMetadata } from "../lib/reality-object";
import type { EventCandidate } from "../lib/events/event-candidate";

// --- subject inference ---
assert.equal(
  inferVisualSubject({ url: "https://cdn.example.com/hotel-room-suite.jpg" }),
  "room",
);
assert.equal(
  inferVisualSubject({ url: "https://cdn.example.com/ramen-food-bowl.jpg" }),
  "food",
);
assert.equal(
  inferVisualSubject({ url: "https://cdn.example.com/osaka-castle-panorama.jpg" }),
  "landmark_full",
);

// --- representativeness matrix ---
assert.equal(
  representativenessStars({ objectType: "restaurant", subject: "food" }),
  5,
);
assert.equal(
  representativenessStars({
    objectType: "restaurant",
    subject: "building_exterior",
  }),
  0,
);
assert.equal(
  representativenessStars({ objectType: "hotel", subject: "room" }),
  5,
);
assert.equal(
  representativenessStars({ objectType: "landmark", subject: "landmark_full" }),
  5,
);

// --- select best visual ---
const hotelPick = selectProjectionVisual({
  objectType: "hotel",
  candidates: [
    { url: "https://cdn.example.com/hotel-exterior-facade.jpg" },
    { url: "https://cdn.example.com/hotel-room-guestroom.jpg" },
    { url: "https://cdn.example.com/hotel-lobby.jpg" },
  ],
});
assert.ok(hotelPick);
assert.match(hotelPick!.url, /room/);
assert.ok(hotelPick!.score.total >= 80);

const ramenPick = selectProjectionVisualUrl({
  objectType: "restaurant",
  imageUrls: [
    "https://cdn.example.com/storefront-sign.jpg",
    "https://cdn.example.com/ramen-food-dish.jpg",
  ],
});
assert.match(ramenPick ?? "", /food/);

const castlePick = selectProjectionVisualUrl({
  objectType: "landmark",
  imageUrls: [
    "https://cdn.example.com/castle-entrance-gate.jpg",
    "https://cdn.example.com/osaka-castle-panorama.jpg",
  ],
});
assert.match(castlePick ?? "", /panorama|castle/);

const exteriorScore = scoreVisualCandidate({
  objectType: "hotel",
  candidate: { url: "https://cdn.example.com/hotel-exterior-facade.jpg" },
});
const roomScore = scoreVisualCandidate({
  objectType: "hotel",
  candidate: { url: "https://cdn.example.com/hotel-room-suite.jpg" },
});
assert.ok(roomScore.score.total > exteriorScore.score.total);

// --- LOD ---
assert.equal(resolveVisualProjectionLod("space"), "glyph");
assert.equal(resolveVisualProjectionLod("region"), "glyph");
assert.equal(resolveVisualProjectionLod("city"), "glyph_label");
assert.equal(resolveVisualProjectionLod("neighborhood"), "image");
assert.equal(resolveVisualProjectionLod("pin"), "image");
assert.equal(
  resolveMarkerVisualLod({
    detailLevel: "neighborhood",
    tier: "background",
  }),
  "glyph_label",
);

// --- halo families ---
assert.equal(resolveObjectHaloStyle("restaurant").family, "food");
assert.equal(resolveObjectHaloStyle("hotel").family, "lodging");
assert.equal(resolveObjectHaloStyle("landmark").family, "landmark");
assert.equal(resolveObjectHaloStyle("restaurant").discoveryAccent, "orange");
assert.equal(resolveObjectHaloStyle("hotel").discoveryAccent, "blue");

// --- buildRealityObject uses visual selection ---
const object = buildRealityObject({
  contextEventId: "ctx-osaka",
  title: "Hilton Osaka",
  placeId: "hilton-1",
  pinKind: "lodging",
  images: [
    "https://cdn.example.com/hilton-exterior-building.jpg",
    "https://cdn.example.com/hilton-room-suite.jpg",
  ],
  coverImageUrl: "https://cdn.example.com/hilton-exterior-building.jpg",
});
assert.match(object.coverImageUrl ?? "", /room/);

// --- context hierarchical projection ---
const event = {
  id: "ctx-osaka",
  metadata: upsertRealityObjectMetadata({
    metadata: {},
    object: buildRealityObject({
      contextEventId: "ctx-osaka",
      title: "Ichiran",
      placeId: "ichiran-1",
      pinKind: "eatery",
      images: ["https://cdn.example.com/ramen-food.jpg"],
    }),
  }),
} as unknown as EventCandidate;

const placeIds = listContextProjectionPlaceIds(event);
assert.ok(placeIds.has("ichiran-1"));
assert.equal(
  resolveProjectionTierForPlace({
    placeId: "ichiran-1",
    contextPlaceIds: placeIds,
    contextWorkspaceActive: true,
  }),
  "foreground",
);
assert.equal(
  resolveProjectionTierForPlace({
    placeId: "other-hotel",
    contextPlaceIds: placeIds,
    contextWorkspaceActive: true,
  }),
  "background",
);

const filtered = filterMarkersByContextProjection({
  markers: [
    { placeId: "ichiran-1", resourceId: "a" },
    { placeId: "other-hotel", resourceId: "b" },
  ],
  contextPlaceIds: placeIds,
  contextWorkspaceActive: true,
  keepBackground: false,
});
assert.equal(filtered.length, 1);
assert.equal(filtered[0]!.placeId, "ichiran-1");

console.log("test-visual-projection-engine: ok");
