#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import {
  EXPERIENCE_BEHAVIOR_WEIGHTS,
  readExperienceBehaviorScore,
  scoreExperienceMeaning,
} from "../lib/context-weight";
import { buildMeaningGraph } from "../lib/meaning/build-meaning-graph";
import {
  matchRecallTriggers,
  resolveRecallCandidates,
} from "../lib/recall";
import { buildRecallEventSnapshot } from "../lib/recall/recall-event-snapshot";
import { GLOBE_CONTEXT_NOTE_KEY } from "../lib/globe/pin-context-note";

function baseEvent(overrides: Partial<EventCandidate>): EventCandidate {
  return {
    id: "ev-cwe-test",
    title: "테스트",
    category: "travel",
    source: "message",
    lifecycle: "completed",
    confidence: 0.8,
    lifecycleUpdatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const now = new Date("2026-06-10T14:00:00.000Z");

const denseEvent = baseEvent({
  id: "ev-dense",
  title: "제주 여행",
  place: "제주시",
  datetime: "2025-06-10T14:00:00.000Z",
  metadata: {
    planPeerDisplayName: "민수",
    feedPlanEnabled: true,
    [GLOBE_CONTEXT_NOTE_KEY]: "카페 투어 좋았음",
    feedCaptures: [
      {
        id: "p1",
        kind: "photo",
        capturedAtIso: "2025-06-10T15:00:00.000Z",
        verified: true,
      },
      {
        id: "p2",
        kind: "photo",
        capturedAtIso: "2025-06-10T16:00:00.000Z",
        verified: true,
      },
    ],
  },
});

const graph = buildMeaningGraph([denseEvent], now);
const weight = scoreExperienceMeaning(denseEvent, { graph, now });
assert.ok(weight.total > 0, "meaning weight should be positive for dense event");
assert.ok(weight.density > 0, "density should reflect captures and plan");

const behaviorScore =
  EXPERIENCE_BEHAVIOR_WEIGHTS.open + EXPERIENCE_BEHAVIOR_WEIGHTS.share;
assert.equal(behaviorScore, 11, "behavior weights should sum open + share");
assert.equal(
  readExperienceBehaviorScore(denseEvent.id),
  0,
  "behavior store is browser-only; node reads stay at zero",
);

const pastSnapshot = buildRecallEventSnapshot(denseEvent, now);
const anchorSnapshot = {
  people: pastSnapshot.people,
  place: pastSnapshot.place,
  city: pastSnapshot.city,
  monthDay: pastSnapshot.monthDay,
  year: 2026,
  gcalEventId: null,
  titleFingerprint: pastSnapshot.titleFingerprint,
  dayOfWeek: pastSnapshot.dayOfWeek,
  hourBucket: pastSnapshot.hourBucket,
  planMode: "group" as const,
  noteTokens: ["카페", "투어"],
};

const matches = matchRecallTriggers(anchorSnapshot, pastSnapshot);
assert.ok(
  matches.some((row) => row.trigger === "similar_time_of_week"),
  "similar_time_of_week should fire for same weekday/hour bucket",
);
assert.ok(
  matches.some((row) => row.trigger === "plan_mode_match"),
  "plan_mode_match should fire",
);
assert.ok(
  matches.some((row) => row.trigger === "context_note_echo"),
  "context_note_echo should fire for shared note tokens",
);

const activePlan = baseEvent({
  id: "ev-active",
  title: "제주 여행",
  lifecycle: "active",
  place: "제주시",
  datetime: "2026-06-10T14:00:00.000Z",
  metadata: {
    planPeerDisplayName: "민수",
    feedPlanEnabled: true,
    planMode: "group",
    [GLOBE_CONTEXT_NOTE_KEY]: "카페 투어 다시 가고 싶음",
  },
});

const candidates = resolveRecallCandidates({
  anchor: {
    eventId: activePlan.id,
    title: activePlan.title,
    place: "제주시",
    peerDisplayName: "민수",
    datetimeIso: activePlan.datetime,
    planMode: "group",
    contextNote: "카페 투어",
  },
  events: [denseEvent, activePlan],
  now,
  limit: 5,
});

assert.ok(candidates.length > 0, "recall candidates should include past event");
assert.equal(candidates[0]?.eventId, denseEvent.id);

console.log("test-context-weight-engine: ok");
