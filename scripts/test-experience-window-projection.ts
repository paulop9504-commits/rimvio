#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import type { ExperienceBridgeTimelineItem } from "../lib/experience-bridge/experience-bridge-types";
import { mergeBridgeTimeline, buildBridgeSnapshot } from "../lib/experience-bridge";
import {
  classifyExperiencePhase,
  groupBridgeTimelineByPhase,
  resolveExperienceWindow,
} from "../lib/experience-window";
import type { PeerMessageRow } from "../lib/peer-chat/types";

function tripEvent(): EventCandidate {
  return {
    id: "ev-osaka",
    title: "오사카 여행",
    category: "travel",
    source: "manual",
    lifecycle: "scheduled",
    confidence: 0.9,
    datetime: "2026-07-10T09:00:00+09:00",
    place: "오사카",
    lifecycleUpdatedAt: "2026-06-01T00:00:00.000Z",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    metadata: {
      feedPlanEnabled: true,
      planWindowEndIso: "2026-07-12T18:00:00+09:00",
      planPeerThreadId: "thread-osaka",
    },
  };
}

const event = tripEvent();
const bridge = buildBridgeSnapshot({
  event,
  hostUserId: "host-1",
  peerThreadId: "thread-osaka",
});
bridge.createdAtIso = "2026-06-05T12:00:00.000Z";

const window = resolveExperienceWindow({
  event,
  bridge,
  now: new Date("2026-06-15T00:00:00.000Z"),
});

assert.equal(window.tripTiming, "future");
assert.equal(window.windowStartIso, "2026-07-10T09:00:00+09:00");
assert.equal(window.bridgeCreatedAtIso, "2026-06-05T12:00:00.000Z");

assert.equal(
  classifyExperiencePhase("2026-06-08T10:00:00.000Z", window),
  "prep",
);
assert.equal(
  classifyExperiencePhase("2026-07-11T10:00:00.000Z", window),
  "live",
);
assert.equal(
  classifyExperiencePhase("2026-07-20T10:00:00.000Z", window),
  "recall",
);

const chatMessage: PeerMessageRow = {
  id: "msg-1",
  thread_id: "thread-osaka",
  sender_user_id: "user-b",
  body: "비행기 표 확인했어",
  message_type: "human",
  ai_payload: null,
  image_url: null,
  created_at: "2026-06-08T11:00:00.000Z",
};

const timeline = mergeBridgeTimeline({
  bridge,
  peerMessages: [chatMessage],
  participants: [
    { userId: "host-1", displayName: "민수" },
    { userId: "user-b", displayName: "지연" },
  ],
  viewerUserId: "host-1",
  hostDisplayName: "민수",
  experienceWindow: window,
});

assert.ok(timeline.some((row) => row.kind === "bridge_prep_marker"));
const chat = timeline.find((row) => row.kind === "chat_message");
assert.ok(chat);
assert.equal(chat?.body, "비행기 표 확인했어");
assert.equal(chat?.phase, "prep");

const sorted = [...timeline].sort(
  (a, b) => Date.parse(a.capturedAtIso) - Date.parse(b.capturedAtIso),
);
assert.deepEqual(
  timeline.map((row) => row.id),
  sorted.map((row) => row.id),
);

const groups = groupBridgeTimelineByPhase(timeline);
assert.equal(groups.length, 1);
assert.equal(groups[0]?.phase, "prep");
assert.equal(groups[0]?.items.length, 2);
assert.ok(groups[0]?.items.some((row: ExperienceBridgeTimelineItem) => row.kind === "bridge_prep_marker"));
assert.ok(groups[0]?.items.some((row: ExperienceBridgeTimelineItem) => row.kind === "chat_message"));

console.log("test-experience-window-projection: ok");
