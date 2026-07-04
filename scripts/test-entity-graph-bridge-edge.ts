#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { EXPERIENCE_BRIDGE_META_KEYS } from "../lib/ontology/experience-bridge-meta-keys";
import {
  materializeBridgeCoParticipantEdge,
  readEntityGraphSnapshot,
  resetEntityGraphStoreForTests,
} from "../lib/ontology";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";

resetEventCandidatesForTests([]);
resetEntityGraphStoreForTests();

commitEventUpsert({
  id: "ev-bridge-1",
  title: "함께한 제주",
  category: "travel",
  source: "message",
  lifecycle: "completed",
  metadata: {
    [EXPERIENCE_BRIDGE_META_KEYS.bridgeId]: "ev-bridge-1",
    [EXPERIENCE_BRIDGE_META_KEYS.hostUserId]: "user-host",
    [EXPERIENCE_BRIDGE_META_KEYS.peerThreadId]: "peer-bridge-1",
    [EXPERIENCE_BRIDGE_META_KEYS.participantUserId]: "user-guest",
    experienceBridgeParticipant: true,
  },
});

const edge = readEntityGraphSnapshot().edges.find((edge) => edge.kind === "co_participant");
assert.ok(edge, "expected co_participant on bridge participant commit");
assert.ok(
  edge!.evidence.some((row) => row.type === "bridge" && row.id === "ev-bridge-1"),
  "bridge evidence required",
);
assert.ok(
  edge!.evidence.some((row) => row.type === "event" && row.id === "ev-bridge-1"),
  "event evidence required",
);

resetEntityGraphStoreForTests();

const direct = materializeBridgeCoParticipantEdge({
  bridgeEventId: "bridge-event-2",
  hostUserId: "host-2",
  participantUserId: "guest-2",
  eventId: "ev-2",
  atIso: "2026-06-03T12:00:00.000Z",
});
assert.ok(direct);
assert.ok(readEntityGraphSnapshot().edges.some((row) => row.id === direct!.id));

console.log("test-entity-graph-bridge-edge: ok");
