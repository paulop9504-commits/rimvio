#!/usr/bin/env npx tsx
/**
 * Ingress Find gate — Japan tokens + auto_attach / ask_chips / create_new.
 */

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { resolveIngressContextConverge } from "../lib/globe-ingress/resolve-ingress-context-converge";
import { splitContextSearchQuery } from "../lib/search/split-context-search-query";

assert.deepEqual(splitContextSearchQuery("일본 여행").experienceTerms.sort(), [
  "여행",
  "일본",
]);
assert.deepEqual(splitContextSearchQuery("일본 여행").peopleTerms, []);

function japanTrip(id: string, peer: string | null, day: number): EventCandidate {
  return {
    id,
    title: "일본 여행",
    category: "travel",
    source: "chat",
    lifecycle: "active",
    datetime: `2025-0${day}-01T10:00:00.000Z`,
    place: "일본",
    confidence: 0.9,
    metadata: {
      feedPlanEnabled: true,
      ...(peer
        ? {
            planPeerDisplayName: peer,
            planWindowEndIso: `2025-0${day}-05T10:00:00.000Z`,
          }
        : {}),
      feedCaptures: [
        {
          id: `cap-${id}`,
          kind: "photo",
          capturedAtIso: `2025-0${day}-02T11:00:00.000Z`,
          placeLabel: "도쿄",
        },
      ],
    },
    lifecycleUpdatedAt: `2025-0${day}-01T10:00:00.000Z`,
    createdAt: `2025-0${day}-01T10:00:00.000Z`,
    updatedAt: `2025-0${day}-02T11:00:00.000Z`,
  };
}

const empty = resolveIngressContextConverge({
  utterance: "일본 여행 가려고",
  events: [],
});
assert.equal(empty.decision, "create_new");
assert.equal(empty.hits.length, 0);

const oneClear = resolveIngressContextConverge({
  utterance: "일본 여행 가려고",
  events: [japanTrip("evt-jp-1", "민수", 3)],
});
assert.equal(oneClear.decision, "auto_attach");
assert.equal(oneClear.attachEventId, "evt-jp-1");
assert.ok(oneClear.hits[0]!.score >= 18);

const ambiguous = resolveIngressContextConverge({
  utterance: "일본 여행 가려고",
  events: [
    japanTrip("evt-jp-a", "민수", 3),
    japanTrip("evt-jp-b", "지연", 4),
  ],
});
assert.ok(
  ambiguous.decision === "ask_chips" || ambiguous.decision === "auto_attach",
  `expected ask or auto, got ${ambiguous.decision}`,
);
if (ambiguous.hits.length >= 2) {
  const gap = ambiguous.hits[0]!.score - ambiguous.hits[1]!.score;
  if (gap < 8 && ambiguous.hits[0]!.score >= 18) {
    assert.equal(ambiguous.decision, "ask_chips");
  }
}

const unrelated = resolveIngressContextConverge({
  utterance: "일본 여행 가려고",
  events: [
    {
      id: "evt-seoul",
      title: "강남 약속",
      category: "schedule",
      source: "chat",
      lifecycle: "active",
      datetime: "2026-07-01T10:00:00.000Z",
      place: "강남",
      confidence: 0.8,
      metadata: {},
      lifecycleUpdatedAt: "2026-07-01T10:00:00.000Z",
      createdAt: "2026-07-01T10:00:00.000Z",
      updatedAt: "2026-07-01T10:00:00.000Z",
    },
  ],
});
assert.ok(
  unrelated.decision === "create_new" ||
    (unrelated.hits[0] && unrelated.hits[0].score < 18),
);

console.log("✓ ingress-context-converge", oneClear.decision, oneClear.hits[0]?.meaningWhy);
