import assert from "node:assert/strict";
import { rankGlobeContextShareFriends } from "../lib/experience-bridge/rank-globe-context-share-friends";
import type { EventCandidate } from "../lib/events/event-candidate";
import type { GlobeContextShareFriend } from "../lib/experience-bridge/share-context-with-friends";

const friends: GlobeContextShareFriend[] = [
  {
    userId: "u-minsoo",
    displayName: "민수",
    peerThreadId: "peer-minsoo",
  },
  {
    userId: "u-jung",
    displayName: "정성",
    peerThreadId: "peer-jung",
  },
  {
    userId: "u-yuna",
    displayName: "유나",
    peerThreadId: "peer-yuna",
  },
];

const event = {
  id: "plan:shanghai:1",
  title: "상하이",
  category: "travel",
  source: "manual",
  lifecycle: "active",
  datetime: "2026-06-01T10:00:00+09:00",
  place: "상하이",
  confidence: 0.9,
  metadata: {
    feedPlanEnabled: true,
    planPeerDisplayName: "정성",
    planPeerThreadId: "peer-jung",
  },
} satisfies EventCandidate;

const ranked = rankGlobeContextShareFriends({ friends, event });
assert.equal(ranked[0]?.displayName, "정성");
assert.equal(ranked[1]?.displayName, "민수");
assert.equal(ranked[2]?.displayName, "유나");

console.log("test-rank-globe-context-share-friends: ok");
