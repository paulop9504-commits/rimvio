#!/usr/bin/env npx tsx
/**
 * Ingress Find gate — actionable work → create_new; vague only → ask_chips with hits.
 */

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import {
  isActionableTripWorkUtterance,
  resolveIngressContextConverge,
} from "../lib/globe-ingress/resolve-ingress-context-converge";
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

assert.equal(isActionableTripWorkUtterance("도쿄 4박5일 계획 세워"), true);
assert.equal(isActionableTripWorkUtterance("일본 여행 가려고"), true);
assert.equal(isActionableTripWorkUtterance("여행"), false);

const empty = resolveIngressContextConverge({
  utterance: "일본 여행 가려고",
  events: [],
});
assert.equal(empty.decision, "create_new");

const actionableWithHit = resolveIngressContextConverge({
  utterance: "도쿄 4박5일 계획 세워",
  events: [japanTrip("evt-jp-1", "민수", 3)],
});
assert.equal(
  actionableWithHit.decision,
  "create_new",
  "actionable work must not open empty Context picker",
);

const vague = resolveIngressContextConverge({
  utterance: "여행",
  events: [
    japanTrip("evt-jp-a", "민수", 3),
    japanTrip("evt-jp-b", "지연", 4),
  ],
});
assert.ok(
  vague.decision === "ask_chips" || vague.decision === "create_new",
  `got ${vague.decision}`,
);
if (vague.decision === "ask_chips") {
  assert.ok(vague.hits.length >= 1);
}

console.log("✓ ingress-context-converge");
