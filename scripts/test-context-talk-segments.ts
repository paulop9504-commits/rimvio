#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { PeerMessage } from "../lib/context/peer-message-types";
import { PEER_GLOBE_PIN_PAYLOAD_KIND } from "../lib/peer-chat/globe-pin-types";
import {
  formatContextTalkSegmentLabel,
  projectContextTalkSegments,
  resolveContextTalkSegmentForMessage,
} from "../lib/experience-window/project-context-talk-segments";
import { resolveExperienceWindow } from "../lib/experience-window/resolve-experience-window";
import type { EventCandidate } from "../lib/events/event-candidate";

const event: EventCandidate = {
  id: "ev-talk",
  title: "상하이 여행",
  category: "travel",
  source: "manual",
  lifecycle: "completed",
  confidence: 0.9,
  datetime: "2024-01-12T09:00:00+09:00",
  place: "상하이",
  metadata: {
    feedPlanEnabled: true,
    planWindowEndIso: "2024-01-14T18:00:00+09:00",
    planPeerThreadId: "thread-sh",
    globePlaceLat: 31.2397,
    globePlaceLng: 121.4998,
    globePlaceLabel: "상하이",
    globePlaceConfirmed: true,
  },
  lifecycleUpdatedAt: "2024-01-12T00:00:00.000Z",
  createdAt: "2024-01-12T00:00:00.000Z",
  updatedAt: "2024-01-12T00:00:00.000Z",
};

const window = resolveExperienceWindow({
  event,
  bridge: { createdAtIso: "2024-01-01T00:00:00.000Z", peerThreadId: "thread-sh" },
  now: new Date("2026-06-22T12:00:00+09:00"),
});

const messages: PeerMessage[] = [
  {
    id: "m1",
    peerThreadId: "thread-sh",
    author: "peer",
    body: "오리엔탈 펄 타워 앞에서 만나요",
    sentAt: "2024-01-12T14:00:00+09:00",
    messageType: "human",
  },
  {
    id: "m2",
    peerThreadId: "thread-sh",
    author: "me",
    body: "",
    sentAt: "2024-01-12T15:00:00+09:00",
    messageType: "system",
    aiPayload: {
      kind: PEER_GLOBE_PIN_PAYLOAD_KIND,
      pinId: "pin-1",
      lat: 31.2397,
      lng: 121.4998,
      placeLabel: "오리엔탈 펄",
      senderDisplayName: "민수",
      capturedAtIso: "2024-01-12T15:00:00+09:00",
      imageUrl: "https://example.com/sh.jpg",
      mediaKind: "photo",
    },
  },
];

const segments = projectContextTalkSegments({
  messages,
  window,
  event,
  tripTitle: "상하이 여행",
  now: new Date("2026-06-22T12:00:00+09:00"),
});

assert.equal(segments.length, 1);
assert.equal(segments[0]?.messageIds.length, 2);
assert.ok(segments[0]?.mapPins.length >= 1);
assert.ok(formatContextTalkSegmentLabel({
  occurredAtIso: "2024-01-12T14:00:00+09:00",
  tripTitle: "상하이 여행",
  phase: "recall",
}).includes("상하이"));

const resolved = resolveContextTalkSegmentForMessage(segments, "m2");
assert.equal(resolved?.id, segments[0]?.id);

console.log("test-context-talk-segments: ok");
