#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import {
  attachMediaRealityObjectMetadata,
  buildMediaRealityObject,
  commitMediaRealityObjectToEvent,
  isShortFormVideoUrl,
  listRealityObjects,
  resolveMediaRealityObjectType,
} from "../lib/reality-object";
import { commitCaptureToEvent } from "../lib/feed/ingest-search-capture";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";

assert.equal(resolveMediaRealityObjectType({ kind: "photo" }), "photo");
assert.equal(resolveMediaRealityObjectType({ kind: "video" }), "video");
assert.equal(
  resolveMediaRealityObjectType({
    kind: "video",
    sourceUrl: "https://www.youtube.com/shorts/abc123",
  }),
  "reel",
);
assert.equal(isShortFormVideoUrl("https://www.instagram.com/reel/xyz"), true);

const photo = buildMediaRealityObject({
  contextEventId: "ctx-osaka",
  mediaId: "media-photo-1",
  mediaKind: "photo",
  title: "도톤보리 밤",
  placeLabel: "도톤보리",
  coverImageUrl: "https://cdn.example.com/dotonbori.jpg",
  lat: 34.6687,
  lng: 135.5013,
  capturedAtIso: "2026-07-18T12:00:00.000Z",
});
assert.equal(photo.objectType, "photo");
assert.equal(photo.coverImageUrl, "https://cdn.example.com/dotonbori.jpg");
assert.ok(photo.execution.capabilities.includes("add_to_inbox"));
assert.equal(photo.metadata.mediaId, "media-photo-1");

const reel = buildMediaRealityObject({
  contextEventId: "ctx-osaka",
  mediaId: "guide:yt-1",
  mediaKind: "video",
  title: "오사카 숏폼",
  sourceUrl: "https://www.youtube.com/shorts/osaka1",
  coverImageUrl: "https://i.ytimg.com/vi/osaka1/hqdefault.jpg",
});
assert.equal(reel.objectType, "reel");
assert.ok((reel.ontology.videos?.length ?? 0) >= 1);

resetEventCandidatesForTests();
const stamp = new Date().toISOString();
const event = commitEventUpsert({
  id: "ctx-media-ingress",
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

const committed = commitMediaRealityObjectToEvent({
  event,
  mediaId: "media-photo-1",
  mediaKind: "photo",
  title: "도톤보리 밤",
  coverImageUrl: "https://cdn.example.com/dotonbori.jpg",
});
const objects = listRealityObjects(committed);
assert.ok(objects.some((row) => row.objectType === "photo"));

const capture = commitCaptureToEvent({
  target: committed,
  match: {
    eventId: committed.id,
    eventTitle: committed.title,
    confidence: "high",
    score: 1,
    placeLabel: "오사카",
    dayLabel: null,
    reason: "test",
  },
  createdNewEvent: false,
  fragment: {
    id: "frag-video-1",
    kind: "video",
    capturedAtIso: stamp,
    mediaContextId: "media-video-1",
    placeLabel: "우메다",
    url: "https://cdn.example.com/umeda.mp4",
  },
  userConfirmedTarget: true,
});
const afterCapture = listRealityObjects(capture.event);
assert.ok(afterCapture.some((row) => row.objectType === "video"));

const metaOnly = attachMediaRealityObjectMetadata({
  metadata: {},
  contextEventId: "ctx-x",
  mediaId: "m1",
  mediaKind: "reel",
  sourceUrl: "https://www.youtube.com/shorts/zz",
});
assert.equal(metaOnly.object.objectType, "reel");

console.log("test-media-reality-object: ok");
