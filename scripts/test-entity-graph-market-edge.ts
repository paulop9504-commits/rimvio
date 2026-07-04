#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { buildMarketCompletionTraceDraft } from "../lib/globe/market/build-market-completion-trace-draft";
import { commitMarketCompletionTrace } from "../lib/globe/market/commit-market-completion-trace";
import type { MarketHandshakeRecord } from "../lib/globe/market/market-handshake-types";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";
import {
  materializeMarketEdge,
  readEntityGraphSnapshot,
  resetEntityGraphStoreForTests,
} from "../lib/ontology";

function handshake(overrides: Partial<MarketHandshakeRecord> = {}): MarketHandshakeRecord {
  return {
    id: "hs-test-1",
    seekingIntentId: "intent-seek",
    listingIntentId: "intent-list",
    seekingUserId: "user-seeker",
    listingUserId: "user-lister",
    threadId: "thread-market-1",
    phase: "completed",
    alignmentScore: 0.9,
    priorityHint: "high",
    listingAcceptedAtIso: "2026-06-01T10:00:00.000Z",
    buyerStartedAtIso: "2026-06-01T11:00:00.000Z",
    seekingConfirmedAtIso: "2026-06-02T10:00:00.000Z",
    listingConfirmedAtIso: "2026-06-02T10:00:00.000Z",
    realizedPriceKrw: 1_200_000,
    completedAtIso: "2026-06-02T10:00:00.000Z",
    createdAtIso: "2026-06-01T09:00:00.000Z",
    updatedAtIso: "2026-06-02T10:00:00.000Z",
    tradeStatus: "completed",
    meetMode: "in_person",
    meetAtIso: null,
    meetPlaceLabel: null,
    meetLat: null,
    meetLng: null,
    guestShareLocation: false,
    guestLat: null,
    guestLng: null,
    guestLocationAtIso: null,
    scheduleCandidates: [],
    preferredMeetDateKey: null,
    preferredMeetAtIso: null,
    schedulingExpiresAtIso: null,
    tradeCancelReasonId: null,
    tradeCancelledAtIso: null,
    ...overrides,
  };
}

resetEventCandidatesForTests([]);
resetEntityGraphStoreForTests();

// (A) completion trace commit → trade_partner
const trace = buildMarketCompletionTraceDraft({
  handshake: handshake(),
  viewerRole: "seeking",
  viewerUserId: "user-seeker",
  productName: "맥북",
  priceLine: "120만원",
  placeLabel: "강남",
  lat: 37.5,
  lng: 127.0,
});
commitMarketCompletionTrace({ trace, threadId: "thread-market-1" });

const pathA = readEntityGraphSnapshot().edges.find((edge) => edge.kind === "trade_partner");
assert.ok(pathA, "(A) expected trade_partner after completion trace commit");
assert.ok(
  pathA!.evidence.some((row) => row.type === "trade" && row.id === "hs-test-1"),
  "trade evidence required",
);
assert.ok(
  pathA!.fromEntityId === "person:user-lister" || pathA!.toEntityId === "person:user-lister",
  "listing user on edge",
);

resetEntityGraphStoreForTests();

// (B) handshake complete without trace pin — direct writer
const edgeB = materializeMarketEdge(handshake(), {
  eventId: "ev-fallback",
  atIso: "2026-06-02T10:00:00.000Z",
});
assert.ok(edgeB, "(B) expected trade_partner from completed handshake");
const pathB = readEntityGraphSnapshot().edges.find((edge) => edge.kind === "trade_partner");
assert.ok(pathB);
assert.equal(materializeMarketEdge(handshake({ phase: "active" })), null, "active is not complete");

// Phase 1 regression — meaning edges still materialize
resetEntityGraphStoreForTests();
commitEventUpsert({
  id: "ev-plain",
  title: "민수랑 제주",
  category: "travel",
  source: "message",
  lifecycle: "completed",
  place: "제주",
  metadata: { peerDisplayName: "민수" },
});
assert.ok(
  readEntityGraphSnapshot().edges.some((edge) => edge.kind === "person_place"),
  "phase 1 meaning edges unaffected",
);

console.log("test-entity-graph-market-edge: ok");
