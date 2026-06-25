import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import {
  buildPeerThreadContextIndex,
  resolvePeerThreadContextFromEvents,
} from "../lib/peer-chat/resolve-peer-thread-context-label";
import { buildBridgeContextThreadId } from "../lib/peer-chat/bridge-context-thread";

const eventA: EventCandidate = {
  id: "evt-bridge-a",
  title: "제주 여행",
  datetime: "2026-06-01T00:00:00.000Z",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-10T00:00:00.000Z",
  lifecycle: "active",
  metadata: {},
};

const eventB: EventCandidate = {
  id: "evt-plan-b",
  title: "홍대 저녁",
  datetime: "2026-05-01T00:00:00.000Z",
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-20T00:00:00.000Z",
  lifecycle: "active",
  metadata: {
    planPeerThreadId: "thread-dm-1",
    feedPlanEnabled: true,
  },
};

const bridgeThreadId = buildBridgeContextThreadId(eventA.id);
const index = buildPeerThreadContextIndex([eventA, eventB]);

assert.equal(index.get(bridgeThreadId)?.title, "제주 여행");
assert.equal(index.get("thread-dm-1")?.title, "홍대 저녁");
assert.equal(
  resolvePeerThreadContextFromEvents(bridgeThreadId, [eventA])?.eventId,
  "evt-bridge-a",
);

console.log("--- peer thread context label ---");
console.log("ok");
