#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  isPeerThreadInactive,
  peerChatStoragePathFromPublicUrl,
  peerThreadMediaInactiveCutoffMs,
} from "../lib/peer-chat/peer-thread-media-retention";

const cutoff = peerThreadMediaInactiveCutoffMs(Date.parse("2026-06-24T00:00:00.000Z"));
assert.equal(
  isPeerThreadInactive("2026-05-01T00:00:00.000Z", cutoff, Date.parse("2026-06-24T00:00:00.000Z")),
  true,
);
assert.equal(
  isPeerThreadInactive("2026-06-20T00:00:00.000Z", cutoff, Date.parse("2026-06-24T00:00:00.000Z")),
  false,
);
assert.equal(
  peerChatStoragePathFromPublicUrl(
    "https://x.supabase.co/storage/v1/object/public/peer-chat/u1/t1/m1.mp4",
  ),
  "u1/t1/m1.mp4",
);

console.log("test-peer-thread-media-retention: ok");
