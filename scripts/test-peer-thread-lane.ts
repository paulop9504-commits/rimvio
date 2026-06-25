import assert from "node:assert/strict";
import { buildAlignmentChatSlots } from "@/lib/peer-chat/alignment-chat-types";
import {
  invertMarketIntentRole,
  resolveOtherPartyMarketRole,
} from "@/lib/globe/market/market-intent-role";
import {
  peerThreadMatchesLane,
  resolvePeerThreadLaneKind,
} from "@/lib/peer-chat/peer-thread-lane";
import { buildBridgeContextThreadId } from "@/lib/peer-chat/bridge-context-thread";

assert.equal(invertMarketIntentRole("seeking"), "listing");
assert.equal(resolveOtherPartyMarketRole("listing"), "seeking");
assert.equal(resolveOtherPartyMarketRole(null), null);

const alignmentIds = new Set(["peer-dm-a__b", "peer-dm-c__d"]);

assert.equal(
  resolvePeerThreadLaneKind({
    threadId: "peer-dm-a__b",
    alignmentThreadIds: alignmentIds,
  }),
  "alignment",
);

assert.equal(
  resolvePeerThreadLaneKind({
    threadId: buildBridgeContextThreadId("evt-1"),
    alignmentThreadIds: alignmentIds,
  }),
  "context",
);

assert.equal(
  resolvePeerThreadLaneKind({
    threadId: "peer-dm-x__y",
    alignmentThreadIds: alignmentIds,
    hasContextLink: true,
  }),
  "context",
);

assert.equal(
  resolvePeerThreadLaneKind({
    threadId: "peer-dm-x__y",
    alignmentThreadIds: alignmentIds,
  }),
  "friend",
);

assert.equal(peerThreadMatchesLane("friend", "friend"), true);
assert.equal(peerThreadMatchesLane("friend", "alignment"), false);
assert.equal(peerThreadMatchesLane("all", "alignment"), true);

const slots = buildAlignmentChatSlots(
  [
    {
      handshakeId: "h1",
      threadId: "t1",
      phase: "active",
      portalCategoryId: "used_goods",
      title: "아이폰",
      placeLabel: "강남",
      otherUserId: "u2",
      otherDisplayName: "민수",
      otherAvatarUrl: null,
      otherRole: "listing",
      updatedAtIso: "2026-06-20T10:00:00.000Z",
    },
    {
      handshakeId: "h2",
      threadId: "t2",
      phase: "active",
      portalCategoryId: "used_goods",
      title: "맥북",
      placeLabel: "서초",
      otherUserId: "u3",
      otherDisplayName: "지연",
      otherAvatarUrl: null,
      otherRole: "seeking",
      updatedAtIso: "2026-06-21T10:00:00.000Z",
    },
  ],
  new Map([
    ["t1", 2],
    ["t2", 0],
  ]),
);

assert.equal(slots.length, 1);
assert.equal(slots[0]?.count, 2);
assert.equal(slots[0]?.unreadCount, 2);

console.log("test-peer-thread-lane: ok");
