#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  inferDiscoveryFeedScrollIntent,
  recordDiscoveryFeedScrollSignal,
  readDiscoveryFeedScrollSignals,
  countDiscoveryFeedRejectSignals,
} from "../lib/globe/intelligent-pin/record-discovery-feed-scroll-signal";

assert.equal(
  inferDiscoveryFeedScrollIntent({ dwellMs: 400, pinned: false }),
  "reject_candidates",
);
assert.equal(
  inferDiscoveryFeedScrollIntent({ dwellMs: 1500, pinned: false }),
  "explore_more",
);
assert.equal(
  inferDiscoveryFeedScrollIntent({ dwellMs: 400, pinned: true }),
  "explore_more",
);

if (typeof window !== "undefined") {
  const contextEventId = `test-scroll-${Date.now()}`;
  recordDiscoveryFeedScrollSignal({
    contextEventId,
    resourceId: "r1",
    placeId: "p1",
    kind: "lodging",
    intent: "reject_candidates",
    dwellMs: 500,
    atIso: new Date().toISOString(),
  });
  recordDiscoveryFeedScrollSignal({
    contextEventId,
    resourceId: "r2",
    placeId: "p2",
    kind: "lodging",
    intent: "explore_more",
    dwellMs: 2000,
    atIso: new Date().toISOString(),
  });

  assert.equal(readDiscoveryFeedScrollSignals(contextEventId).length, 2);
  assert.equal(countDiscoveryFeedRejectSignals(contextEventId), 1);
}

console.log("test-discovery-feed-scroll-signal: ok");
