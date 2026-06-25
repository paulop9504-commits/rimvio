#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  inferPeerChatMediaKindFromUrl,
  isPeerChatMediaPlaceholder,
  isPeerChatVideoContentType,
} from "../lib/peer-chat/infer-peer-chat-media-kind";

assert.equal(isPeerChatVideoContentType("video/mp4"), true);
assert.equal(inferPeerChatMediaKindFromUrl("https://x/a/b.mp4"), "video");
assert.equal(inferPeerChatMediaKindFromUrl("https://x/a/b.jpg"), "photo");
assert.equal(isPeerChatMediaPlaceholder("동영상"), true);

console.log("test-infer-peer-chat-media-kind: ok");
