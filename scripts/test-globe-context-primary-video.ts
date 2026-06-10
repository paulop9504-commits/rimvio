import assert from "node:assert/strict";
import { resolveGlobeContextPrimaryVideo } from "../lib/globe/resolve-globe-context-primary-video";
import type { EventCandidate } from "../lib/events/event-candidate";

function baseEvent(overrides: Partial<EventCandidate>): EventCandidate {
  const stamp = "2026-06-10T03:00:00.000Z";
  return {
    id: "evt:test",
    title: "테스트",
    category: "travel",
    source: "manual",
    lifecycle: "active",
    datetime: "2026-06-10T10:00:00+09:00",
    confidence: 0.8,
    metadata: {},
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

function testLatestVideoWins() {
  const event = baseEvent({
    metadata: {
      feedCaptures: [
        {
          id: "cap:photo",
          kind: "photo",
          capturedAtIso: "2026-06-10T12:00:00+09:00",
          mediaContextId: "media:photo:1",
        },
        {
          id: "cap:video-old",
          kind: "video",
          capturedAtIso: "2026-06-10T11:00:00+09:00",
          mediaContextId: "media:video:old",
          label: "오래된 영상",
        },
        {
          id: "cap:video-new",
          kind: "video",
          capturedAtIso: "2026-06-10T13:00:00+09:00",
          mediaContextId: "media:video:new",
          label: "최신 영상",
        },
      ],
    },
  });

  const resolved = resolveGlobeContextPrimaryVideo(event);
  assert.ok(resolved);
  assert.equal(resolved!.mediaContextId, "media:video:new");
  assert.equal(resolved!.label, "최신 영상");
}

function testNoVideoReturnsNull() {
  const event = baseEvent({
    metadata: {
      feedCaptures: [
        {
          id: "cap:photo",
          kind: "photo",
          capturedAtIso: "2026-06-10T12:00:00+09:00",
          mediaContextId: "media:photo:1",
        },
      ],
    },
  });
  assert.equal(resolveGlobeContextPrimaryVideo(event), null);
}

testLatestVideoWins();
testNoVideoReturnsNull();
console.log("test-globe-context-primary-video: ok");
