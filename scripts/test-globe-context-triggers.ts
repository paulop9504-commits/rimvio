#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { FEED_CAPTURES_META_KEY } from "../lib/feed/feed-capture-types";
import { resolveGlobeContextTriggers } from "../lib/globe/context-triggers/resolve-globe-context-triggers";
import { scoreTriggerMediaRichness } from "../lib/globe/context-triggers/score-context-trigger-media";

const now = new Date("2026-06-10T14:00:00.000Z");

const events: EventCandidate[] = [
  {
    id: "ev-shanghai",
    title: "상하이 여행",
    place: "상하이",
    datetime: "2025-06-10T08:00:00.000Z",
    createdAt: "2025-06-10T08:00:00.000Z",
    lifecycle: "active",
    metadata: {},
  },
  {
    id: "ev-jeju",
    title: "제주 가족여행",
    place: "제주",
    datetime: "2025-12-20T08:00:00.000Z",
    createdAt: "2025-12-20T08:00:00.000Z",
    lifecycle: "active",
    metadata: {},
  },
  {
    id: "ev-cafe",
    title: "철수랑 점심",
    place: "강남 맛집",
    datetime: "2026-06-08T12:00:00.000Z",
    createdAt: "2026-06-08T12:00:00.000Z",
    lifecycle: "active",
    metadata: { peerDisplayName: "철수" },
  },
  {
    id: "ev-cafe-2",
    title: "철수랑 커피",
    place: "역삼",
    datetime: "2026-06-05T09:00:00.000Z",
    createdAt: "2026-06-05T09:00:00.000Z",
    lifecycle: "active",
    metadata: { peerDisplayName: "철수" },
  },
];

const triggers = resolveGlobeContextTriggers({
  events,
  layerMode: "personal",
  now,
});

assert.ok(triggers.some((row) => row.kind === "time_recall"));
assert.ok(triggers.some((row) => row.kind === "travel_recall"));
assert.ok(triggers.some((row) => row.kind === "person_recall"));
assert.equal(new Set(triggers.map((row) => row.eventId)).size, triggers.length);

const travelOnly = resolveGlobeContextTriggers({
  events: [
    {
      id: "ev-osaka",
      title: "오사카",
      place: "오사카",
      datetime: "2026-01-01T08:00:00.000Z",
      createdAt: "2026-01-01T08:00:00.000Z",
      lifecycle: "active",
      metadata: {},
    },
  ],
  layerMode: "personal",
  now: new Date("2026-03-01T12:00:00.000Z"),
});
assert.ok(travelOnly.some((row) => row.kind === "travel_recall"));

assert.equal(
  resolveGlobeContextTriggers({ events, layerMode: "discovery", now }).length,
  0,
);

const mediaEvents: EventCandidate[] = [
  {
    id: "ev-plain",
    title: "메모만",
    place: "역삼",
    datetime: "2026-06-09T12:00:00.000Z",
    createdAt: "2026-06-09T12:00:00.000Z",
    lifecycle: "active",
    metadata: {},
  },
  {
    id: "ev-photo",
    title: "제주 사진",
    place: "제주",
    datetime: "2026-06-07T12:00:00.000Z",
    createdAt: "2026-06-07T12:00:00.000Z",
    lifecycle: "active",
    metadata: {
      [FEED_CAPTURES_META_KEY]: [
        {
          id: "cap-photo",
          kind: "photo",
          capturedAtIso: "2026-06-07T12:00:00.000Z",
          url: "https://cdn.test/jeju.jpg",
        },
      ],
    },
  },
  {
    id: "ev-video",
    title: "부산 여행",
    place: "부산",
    datetime: "2026-06-06T12:00:00.000Z",
    createdAt: "2026-06-06T12:00:00.000Z",
    lifecycle: "active",
    metadata: {
      [FEED_CAPTURES_META_KEY]: [
        {
          id: "cap-video",
          kind: "video",
          capturedAtIso: "2026-06-06T12:00:00.000Z",
          url: "https://cdn.test/busan.mp4",
        },
      ],
    },
  },
];

const mediaTriggers = resolveGlobeContextTriggers({
  events: mediaEvents,
  layerMode: "personal",
  now: new Date("2026-06-10T12:00:00.000Z"),
  limit: 2,
});

assert.ok(mediaTriggers.length >= 2);
assert.equal(mediaTriggers[0]?.eventId, "ev-video");
assert.ok(scoreTriggerMediaRichness(mediaTriggers[0]!) > scoreTriggerMediaRichness(mediaTriggers[1]!));

console.log("test-globe-context-triggers: ok");
