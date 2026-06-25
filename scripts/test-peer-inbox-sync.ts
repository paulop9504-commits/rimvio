#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { previewRelationshipSlotMessage } from "../lib/peer-chat/relationship-slots-server";
import { buildArchiveChatRows } from "../lib/social/archive-chat-rows";
import type { SocialBubblePeer } from "../lib/social/bubble-state";

const peer: SocialBubblePeer = {
  friendId: "friend-1",
  threadId: "peer-dm-a__b",
  displayName: "정성",
  rimvioId: null,
  avatarUrl: null,
  bubbleState: "urgent",
  isPinned: false,
  pinSlot: null,
  unreadCount: 2,
  lastInteractionAt: "2026-06-10T10:00:00.000Z",
  messagesPurgeAfter: null,
};

const rows = buildArchiveChatRows([peer], [
  {
    slotId: "slot-1",
    roomId: peer.threadId,
    friendId: peer.friendId,
    displayName: peer.displayName,
    rimvioId: null,
    avatarUrl: null,
    lastMessage: "상하이 도착했어",
    lastActivityAt: "2026-06-10T11:00:00.000Z",
    unreadCount: 0,
    isPinned: false,
  },
]);

assert.equal(rows[0]?.lastMessage, "상하이 도착했어");
assert.equal(rows[0]?.unreadCount, 2);

assert.equal(
  previewRelationshipSlotMessage("안녕하세요 ".repeat(40)).endsWith("…"),
  true,
);

console.log("test-peer-inbox-sync: ok");
