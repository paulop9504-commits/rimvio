#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { GLOBE_CONTEXT_NOTE_KEY } from "../lib/globe/pin-context-note";
import { enrichAskRecallContext } from "../lib/personal-context-ask/enrich-ask-recall-context";
import { parsePersonalContextQuery } from "../lib/personal-context-ask/parse-personal-context-query";
import { resolvePersonalContextAsk } from "../lib/personal-context-ask/resolve-personal-context-ask";
import { buildBridgeContextThreadId } from "../lib/peer-chat/bridge-context-thread";
import { buildPersonalAskContinuityActions } from "../lib/globe/globe-ask-continuity";

function baseEvent(overrides: Partial<EventCandidate>): EventCandidate {
  return {
    id: "ev-base",
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

const shanghaiTrip = baseEvent({
  id: "ev-shanghai",
  title: "정성이랑 여행",
  place: "상하이",
  datetime: "2025-01-12T10:00:00.000Z",
  metadata: {
    planPeerDisplayName: "정성",
    [GLOBE_CONTEXT_NOTE_KEY]: "와이탄",
    feedCaptures: [
      {
        id: "p-1",
        kind: "photo",
        capturedAtIso: "2025-01-12T11:00:00.000Z",
        url: "https://example.com/1.jpg",
        verified: true,
      },
    ],
  },
});

const shanghaiOverseas = baseEvent({
  id: "ev-sh-overseas",
  title: "정성이랑 해외",
  place: "상하이",
  datetime: "2025-01-05T10:00:00.000Z",
  metadata: { planPeerDisplayName: "정성" },
});

const events = [shanghaiTrip, shanghaiOverseas];
const parsed = parsePersonalContextQuery("정성이랑 상하이", now);
const result = resolvePersonalContextAsk({
  query: "정성이랑 상하이",
  events,
  scope: "personal",
  now,
});

assert.ok(result.recallContext);
assert.equal(
  result.recallContext.contextTalkThreadId,
  buildBridgeContextThreadId(result.featuredHitId ?? "ev-shanghai"),
);
assert.ok(result.recallContext.coExperienceCount >= 2);

const recall = enrichAskRecallContext({
  parsed,
  hits: result.hits,
  events,
  featuredHitId: result.featuredHitId,
  now,
});
assert.equal(recall.contextTalkThreadId, buildBridgeContextThreadId("ev-shanghai"));

const actions = buildPersonalAskContinuityActions({
  recall,
  featuredEventId: "ev-shanghai",
});
assert.ok(actions.some((row) => row.id === "context_talk"));
assert.ok(actions.some((row) => row.id === "feed_moment"));
assert.ok(actions[0]!.href.startsWith("/peers/peer-bridge-"));

console.log("test-enrich-ask-recall-context: ok");
