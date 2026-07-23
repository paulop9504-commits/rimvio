#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { GLOBE_DEMO_EVENT_IDS } from "../lib/experience-graph/seed-globe-demo-events";
import type { EventCandidate } from "../lib/events/event-candidate";
import { projectPlaceGallery } from "../lib/globe/project-place-gallery";
import { resolveGlobeDetailLevel } from "../lib/globe/globe-zoom-levels";
import { resolveGlobeTileStyleForLevel } from "../lib/globe/globe-tile-engine-url";

const event: EventCandidate = {
  id: GLOBE_DEMO_EVENT_IDS.dunsan,
  title: "둔산동 저녁",
  category: "food",
  source: "manual",
  lifecycle: "completed",
  datetime: "2026-05-01T19:30:00+09:00",
  place: "대전 둔산동",
  confidence: 0.9,
  metadata: {
    feedCaptures: [
      {
        id: "p1",
        kind: "photo",
        capturedAtIso: "2026-05-01T19:30:00+09:00",
        url: "https://cdn.example/user-capture.jpg",
        placeLabel: "대전 둔산동",
      },
    ],
  },
  lifecycleUpdatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const gallery = projectPlaceGallery({ event, volume: null, limit: 6 });
assert.equal(gallery.length, 1);
assert.equal(gallery[0]?.imageUrl, "https://cdn.example/user-capture.jpg");
assert.ok(!gallery.some((row) => row.id.startsWith("stock:")));
assert.ok(!gallery.some((row) => row.imageUrl?.includes("unsplash")));

assert.equal(resolveGlobeDetailLevel(2.2), "space");
assert.equal(resolveGlobeDetailLevel(0.1), "city");
assert.ok(resolveGlobeTileStyleForLevel("city"));

console.log("test-place-gallery: ok");
