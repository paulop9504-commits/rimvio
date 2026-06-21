#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { EXPERIENCE_BRIDGE_META_KEYS } from "../lib/experience-bridge/constants";
import {
  resolveExperiencePeerThreadId,
  resolveExperienceTalkThreadId,
} from "../lib/globe/resolve-experience-peer-thread-id";

const base: EventCandidate = {
  id: "evt-1",
  title: "제주",
  category: "travel",
  source: "manual",
  lifecycle: "scheduled",
  confidence: 0.9,
};

assert.equal(
  resolveExperiencePeerThreadId({
    ...base,
    metadata: {
      [EXPERIENCE_BRIDGE_META_KEYS.peerThreadId]: "thread-bridge-1",
    },
  }),
  "thread-bridge-1",
);

assert.equal(
  resolveExperienceTalkThreadId({
    event: base,
    bridgePeerThreadId: "thread-bridge-2",
    conversationPeerThreadId: "thread-conv",
    experienceRoomThreadId: "thread-room",
  }),
  "thread-conv",
);

assert.equal(
  resolveExperienceTalkThreadId({
    event: {
      ...base,
      metadata: {
        [EXPERIENCE_BRIDGE_META_KEYS.peerThreadId]: "thread-meta",
      },
    },
  }),
  "thread-meta",
);

console.log("test-resolve-experience-peer-thread-id: ok");
