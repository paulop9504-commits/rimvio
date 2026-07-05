#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import {
  inferMediaRegionCountryCode,
  mediaMatchesEventPlaceRegion,
} from "../lib/globe/filter-context-media-for-place-region";
import { projectBridgePreviewMedia } from "../lib/globe/project-bridge-preview-media";
import { projectContextMediaReel } from "../lib/globe/project-context-media-reel";
import { resetMediaContextStoreForTests } from "../lib/location-ping/media-context-store";

const japanEvent: EventCandidate = {
  id: "plan:도쿄:1781241660000",
  title: "도쿄",
  category: "travel",
  source: "manual",
  lifecycle: "completed",
  datetime: "2026-07-01T10:00:00+09:00",
  place: "도쿄",
  confidence: 0.9,
  metadata: {
    globePlaceConfirmed: true,
    globePlaceLat: 35.6762,
    globePlaceLng: 139.6503,
    globePlaceLabel: "도쿄",
    feedCaptures: [
      {
        id: "jp-photo",
        kind: "photo",
        capturedAtIso: "2026-07-02T12:00:00+09:00",
        url: "https://example.com/tokyo.jpg",
        placeLabel: "신주쿠",
      },
      {
        id: "kr-photo",
        kind: "photo",
        capturedAtIso: "2026-06-20T12:00:00+09:00",
        url: "https://example.com/seoul.jpg",
        placeLabel: "서울 망원",
      },
    ],
  },
  lifecycleUpdatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

assert.equal(inferMediaRegionCountryCode({ placeLabel: "서울 망원" }), "KR");
assert.equal(inferMediaRegionCountryCode({ placeLabel: "신주쿠" }), "JP");
assert.equal(
  mediaMatchesEventPlaceRegion(japanEvent, { placeLabel: "서울 망원" }),
  false,
);
assert.equal(
  mediaMatchesEventPlaceRegion(japanEvent, { placeLabel: "신주쿠" }),
  true,
);

const reel = projectContextMediaReel({ event: japanEvent, volume: null });
assert.equal(reel.length, 1);
assert.equal(reel[0]?.placeLabel, "신주쿠");

const preview = projectBridgePreviewMedia(japanEvent, 4);
assert.equal(preview.length, 1);
assert.equal(preview[0]?.url, "https://example.com/tokyo.jpg");

resetMediaContextStoreForTests([
  {
    id: "mc-kr-leak",
    mediaKind: "photo",
    capturedAtIso: "2026-06-01T10:00:00+09:00",
    originRef: japanEvent.id,
    lat: 37.55,
    lng: 126.92,
    placeLabel: "서울",
  },
  {
    id: "mc-jp-ok",
    mediaKind: "photo",
    capturedAtIso: "2026-07-02T10:00:00+09:00",
    originRef: japanEvent.id,
    lat: 35.69,
    lng: 139.7,
    placeLabel: "도쿄",
  },
]);

const storeReel = projectContextMediaReel({
  event: { ...japanEvent, metadata: { ...japanEvent.metadata, feedCaptures: [] } },
  volume: null,
});
assert.equal(storeReel.length, 1);
assert.equal(storeReel[0]?.mediaContextId, "mc-jp-ok");

console.log("test-context-media-region-isolation: ok");
