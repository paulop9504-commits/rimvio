#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { dedupeAlignmentChatsByThread } from "../lib/peer-chat/dedupe-alignment-chats";
import type { AlignmentChatListItem } from "../lib/peer-chat/alignment-chat-types";

function item(
  threadId: string,
  updatedAtIso: string,
  otherUserId = "user-b",
): AlignmentChatListItem {
  return {
    handshakeId: `hs-${threadId}-${updatedAtIso}`,
    threadId,
    phase: "active",
    portalCategoryId: "used_goods",
    title: "테스트",
    placeLabel: "",
    otherUserId,
    otherDisplayName: "hope jay",
    otherAvatarUrl: null,
    otherRole: "listing",
    updatedAtIso,
  };
}

const deduped = dedupeAlignmentChatsByThread([
  item("peer-dm-a__b", "2026-06-23T10:00:00.000Z"),
  item("peer-dm-a__b", "2026-06-23T12:00:00.000Z"),
  item("peer-dm-a__c", "2026-06-23T11:00:00.000Z"),
]);

assert.equal(deduped.length, 2);
assert.equal(deduped[0]?.threadId, "peer-dm-a__b");
assert.equal(deduped[0]?.updatedAtIso, "2026-06-23T12:00:00.000Z");

console.log("test-dedupe-alignment-chats: ok");
