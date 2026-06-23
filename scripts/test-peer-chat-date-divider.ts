#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { PeerMessage } from "../lib/context/peer-message-types";
import {
  formatPeerChatDateDividerLabel,
  peerMessageLocalDayKey,
  shouldShowPeerDateDivider,
} from "../lib/peer-chat/peer-chat-date-divider";

function msg(id: string, sentAt: string): PeerMessage {
  return {
    id,
    peerThreadId: "t-1",
    author: "me",
    body: "hi",
    sentAt,
    messageType: "human",
  };
}

assert.equal(peerMessageLocalDayKey("2026-06-24T15:00:00.000Z").length, 10);
assert.match(
  formatPeerChatDateDividerLabel("2026-06-24T12:00:00.000Z"),
  /2026/,
);
assert.equal(shouldShowPeerDateDivider([msg("1", "2026-06-24T10:00:00.000Z")], 0), true);
assert.equal(
  shouldShowPeerDateDivider(
    [msg("1", "2026-06-24T10:00:00.000Z"), msg("2", "2026-06-24T11:00:00.000Z")],
    1,
  ),
  false,
);
assert.equal(
  shouldShowPeerDateDivider(
    [msg("1", "2026-06-23T10:00:00.000Z"), msg("2", "2026-06-24T11:00:00.000Z")],
    1,
  ),
  true,
);

console.log("test-peer-chat-date-divider: ok");
