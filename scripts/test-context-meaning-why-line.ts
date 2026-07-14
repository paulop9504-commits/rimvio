#!/usr/bin/env npx tsx
/**
 * MEANING why-line for Plan / candidates — "민수 = 제주".
 */

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import {
  decorateReasonWithMeaningWhy,
  resolveContextMeaningWhyLine,
} from "../lib/meaning/resolve-context-meaning-why-line";

function eventAt(
  id: string,
  peer: string,
  place: string,
  dayOffset: number,
): EventCandidate {
  const day = String(1 + dayOffset).padStart(2, "0");
  return {
    id,
    title: `${place} 여행`,
    category: "travel",
    source: "chat",
    lifecycle: "active",
    datetime: `2025-06-${day}T10:00:00.000Z`,
    place,
    confidence: 0.9,
    metadata: {
      feedPlanEnabled: true,
      planPeerDisplayName: peer,
      planWindowEndIso: `2025-06-${day}T18:00:00.000Z`,
    },
    lifecycleUpdatedAt: `2025-06-${day}T10:00:00.000Z`,
    createdAt: `2025-06-${day}T10:00:00.000Z`,
    updatedAt: `2025-06-${day}T10:00:00.000Z`,
  };
}

const corpus = [
  eventAt("e1", "민수", "제주", 0),
  eventAt("e2", "민수", "제주", 1),
  eventAt("e3", "민수", "제주", 2),
  eventAt("e4", "민수", "제주", 3),
];

const active = eventAt("e-active", "민수", "제주", 10);
const why = resolveContextMeaningWhyLine({
  event: active,
  events: [...corpus, active],
});
assert.ok(why);
assert.match(why!, /민수/u);
assert.match(why!, /제주/u);

const decorated = decorateReasonWithMeaningWhy(why, "도심에서 가까워요");
assert.ok(decorated.startsWith(why!));
assert.match(decorated, /도심에서 가까워요/u);

assert.equal(
  decorateReasonWithMeaningWhy(why, `${why} · 이미`),
  `${why} · 이미`,
);

console.log("✓ context-meaning-why-line", why);
