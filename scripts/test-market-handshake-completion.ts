#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildMarketCompletionTraceDraft,
  marketCompletionEventId,
  resolveRealizedPriceKrw,
} from "../lib/globe/market/build-market-completion-trace-draft";
import type { MarketHandshakeRecord } from "../lib/globe/market/market-handshake-types";

function handshake(partial: Partial<MarketHandshakeRecord> = {}): MarketHandshakeRecord {
  return {
    id: "hs-11111111-2222-3333-4444-555555555555",
    seekingIntentId: "s1",
    listingIntentId: "l1",
    seekingUserId: "user-seeking",
    listingUserId: "user-listing",
    threadId: "thread-1",
    phase: "active",
    alignmentScore: 0.9,
    priorityHint: "배터리 · 가격",
    listingAcceptedAtIso: null,
    buyerStartedAtIso: null,
    seekingConfirmedAtIso: null,
    listingConfirmedAtIso: null,
    realizedPriceKrw: null,
    completedAtIso: null,
    createdAtIso: "2026-06-23T10:00:00+09:00",
    updatedAtIso: "2026-06-23T10:00:00+09:00",
    ...partial,
  };
}

function main() {
  assert.equal(resolveRealizedPriceKrw(900_000, 900_000), 900_000);
  assert.equal(resolveRealizedPriceKrw(null, 850_000), 850_000);

  const eventId = marketCompletionEventId(
    "hs-11111111-2222-3333-4444-555555555555",
    "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  );
  assert.ok(eventId.startsWith("mc-"));

  const seekingTrace = buildMarketCompletionTraceDraft({
    handshake: handshake(),
    viewerRole: "seeking",
    viewerUserId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    productName: "아이폰 15 프로",
    priceLine: "90만원",
    placeLabel: "강남",
    lat: 37.5,
    lng: 127.0,
  });
  assert.ok(seekingTrace.title.includes("맞춤"));
  assert.ok(seekingTrace.title.includes("강남"));

  const listingTrace = buildMarketCompletionTraceDraft({
    handshake: handshake(),
    viewerRole: "listing",
    viewerUserId: "ffffffff-gggg-hhhh-iiii-jjjjjjjjjjjj",
    productName: "아이폰 15 프로",
    priceLine: "90만원",
    placeLabel: "강남",
    lat: 37.5,
    lng: 127.0,
  });
  assert.ok(listingTrace.title.includes("넘김"));
  assert.notEqual(seekingTrace.eventId, listingTrace.eventId);

  console.log("test-market-handshake-completion: ok");
}

main();
