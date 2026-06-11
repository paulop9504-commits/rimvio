#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { projectContextMediaReel } from "../lib/globe/project-context-media-reel";

const event: EventCandidate = {
  id: "evt-reel",
  title: "상하이 여행",
  category: "travel",
  source: "manual",
  lifecycle: "completed",
  datetime: "2026-01-05T10:00:00+09:00",
  place: "상하이",
  confidence: 0.9,
  metadata: {
    feedCaptures: [
      {
        id: "v1",
        kind: "video",
        capturedAtIso: "2026-01-05T12:00:00+09:00",
        mediaContextId: "mc-video-1",
        placeLabel: "상하이",
        label: "외滩",
      },
      {
        id: "p1",
        kind: "photo",
        capturedAtIso: "2026-01-05T10:00:00+09:00",
        url: "https://example.com/photo.jpg",
        placeLabel: "상하이",
      },
    ],
  },
  lifecycleUpdatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const reel = projectContextMediaReel({ event, volume: null });
assert.equal(reel.length, 2);
assert.equal(reel[0]?.kind, "video");
assert.equal(reel[1]?.kind, "photo");
assert.equal(reel[0]?.mediaContextId, "mc-video-1");

console.log("test-context-media-reel: ok");
