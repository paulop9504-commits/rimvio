import assert from "node:assert/strict";
import {
  createInitialBridgeState,
  inviteBridgeParticipant,
  inviteBridgeParticipantForDirectDelivery,
} from "../lib/experience-bridge/bridge-mutations";
import { buildBridgeSnapshot } from "../lib/experience-bridge/merge-bridge-timeline";
import type { EventCandidate } from "../lib/events/event-candidate";

const event = {
  id: "plan:test:1",
  title: "상하이",
  category: "travel",
  source: "manual",
  lifecycle: "active",
  datetime: "2026-06-01T10:00:00+09:00",
  confidence: 0.9,
  metadata: {},
} satisfies EventCandidate;

const bridge = buildBridgeSnapshot({
  event,
  hostUserId: "host-1",
  peerThreadId: "peer-dm-a__b",
});

const base = createInitialBridgeState({
  bridge,
  hostDisplayName: "나",
});

const pending = inviteBridgeParticipant(base, {
  userId: "friend-1",
  displayName: "정성",
});
assert.equal(
  pending.participants.find((row) => row.userId === "friend-1")?.status,
  "pending",
);

const accepted = inviteBridgeParticipantForDirectDelivery(base, {
  userId: "friend-1",
  displayName: "정성",
});
assert.equal(
  accepted.participants.find((row) => row.userId === "friend-1")?.status,
  "accepted",
);

console.log("test-bridge-direct-delivery: ok");
