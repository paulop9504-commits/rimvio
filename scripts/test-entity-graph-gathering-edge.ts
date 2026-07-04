#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  materializeGatheringLinkEdge,
  readEntityGraphSnapshot,
  resetEntityGraphStoreForTests,
} from "../lib/ontology";

resetEntityGraphStoreForTests();

const edge = materializeGatheringLinkEdge({
  publicBridgeId: "pub-bridge-99",
  personalEventId: "ev-personal-1",
  atIso: "2026-06-04T09:00:00.000Z",
});

assert.ok(edge, "gathering projection edge should be built");
assert.equal(edge!.kind, "gathering_link");
assert.ok(
  edge!.evidence.some((row) => row.type === "gathering" && row.id === "pub-bridge-99"),
);
assert.equal(
  readEntityGraphSnapshot().edges.length,
  0,
  "gathering_link must not persist to rimvio.entity-graph.v1",
);

console.log("test-entity-graph-gathering-edge: ok");
