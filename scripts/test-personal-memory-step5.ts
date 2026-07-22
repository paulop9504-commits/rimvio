#!/usr/bin/env npx tsx
/**
 * STEP5 — personal memory chunks → top-k ask → additive Resource rank boost.
 */

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { FEED_CAPTURES_META_KEY } from "../lib/events/event-metadata-keys";
import {
  chunkEventMemory,
  computeRecallRankBoost,
  queryPersonalMemoryTopK,
  RECALL_RANK_BOOST_CAP,
} from "../lib/personal-memory";
import { resolvePersonalContextAsk } from "../lib/personal-context-ask/resolve-personal-context-ask";

function event(partial: Partial<EventCandidate> & Pick<EventCandidate, "id" | "title">): EventCandidate {
  return {
    lifecycle: "active",
    createdAt: "2030-01-01T00:00:00.000Z",
    updatedAt: "2030-01-01T00:00:00.000Z",
    source: "user",
    place: null,
    datetime: "2024-09-12T12:00:00.000Z",
    metadata: {},
    ...partial,
  };
}

const osakaTrip = event({
  id: "ev-osaka-2024",
  title: "오사카 캡슐 여행",
  place: "난바",
  metadata: {
    [FEED_CAPTURES_META_KEY]: [
      {
        id: "cap-1",
        kind: "photo",
        capturedAtIso: "2024-09-12T15:00:00.000Z",
        placeLabel: "난바 역",
        label: "캡슐호텔 체크인",
      },
    ],
  },
});

const seoulCafe = event({
  id: "ev-seoul-cafe",
  title: "성수 카페",
  place: "성수",
  datetime: "2025-03-01T10:00:00.000Z",
});

{
  const chunks = chunkEventMemory(osakaTrip);
  assert.ok(chunks.length >= 2);
  assert.ok(chunks.some((c) => c.kind === "event"));
  assert.ok(chunks.some((c) => c.kind === "capture"));
}

{
  const hits = queryPersonalMemoryTopK({
    query: "그때 난바 캡슐호텔",
    events: [osakaTrip, seoulCafe],
    k: 3,
  });
  assert.ok(hits.length >= 1);
  assert.equal(hits[0]?.eventId, "ev-osaka-2024");
}

{
  const ask = resolvePersonalContextAsk({
    query: "오사카 난바 그때",
    events: [osakaTrip, seoulCafe],
    scope: "personal",
  });
  assert.ok(ask.hits.length >= 1);
  assert.ok(
    ask.hits.some((hit) => hit.eventId === "ev-osaka-2024"),
    "semantic or lexical should summon Osaka trip",
  );
  assert.ok(ask.featuredHitId);
}

{
  const matched = computeRecallRankBoost({
    resourceLabel: "Nine Hours Namba Capsule",
    placeLabel: "난바",
    recallPlaceNeedles: ["난바", "오사카"],
    recallQuery: "오사카 캡슐 여행",
    contextKey: "ev-osaka-2024",
    actionId: "lodging.resource",
  });
  const miss = computeRecallRankBoost({
    resourceLabel: "Seoul Tower Hotel",
    placeLabel: "명동",
    recallPlaceNeedles: ["난바", "오사카"],
    recallQuery: "오사카 캡슐 여행",
    contextKey: "ev-osaka-2024",
    actionId: "lodging.resource",
  });
  assert.ok(matched > miss);
  assert.ok(matched <= RECALL_RANK_BOOST_CAP);
  assert.ok(matched > 0);
}

console.log("test-personal-memory-step5: ok");
