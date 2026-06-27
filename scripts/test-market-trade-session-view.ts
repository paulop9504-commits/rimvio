#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildMarketTradeSessionRecord,
  buildMarketTradeSessionView,
} from "../lib/globe/market/build-market-trade-session-view";
import type { MarketHandshakeRecord } from "../lib/globe/market/market-handshake-types";
import type { MarketIntentRecord } from "../lib/globe/market/market-intent-types";
import { marketTradeSessionCopy } from "../lib/globe/market/market-trade-copy";
import { isMarketTradeDepartWindowOpen } from "../lib/globe/market/market-trade-depart-window";

const SEEKING_USER = "user-seeking";
const LISTING_USER = "user-listing";

function handshake(partial: Partial<MarketHandshakeRecord>): MarketHandshakeRecord {
  return {
    id: "hs-11111111-2222-3333-4444-555555555555",
    seekingIntentId: "seeking-1",
    listingIntentId: "listing-1",
    seekingUserId: SEEKING_USER,
    listingUserId: LISTING_USER,
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
    tradeStatus: "chat",
    meetMode: "host",
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
    ...partial,
  };
}

function listing(): MarketIntentRecord {
  return {
    id: "listing-1",
    userId: LISTING_USER,
    eventId: "event-1",
    role: "listing",
    categoryId: "market.phone",
    title: "아이폰 15",
    priceMinKrw: 500_000,
    priceMaxKrw: null,
    radiusKm: 5,
    anchorLat: 37.5,
    anchorLng: 127,
    placeLabel: "강남",
    peakHour: null,
    confirmedAtIso: "2026-06-23T10:00:00+09:00",
    active: true,
    detail: { productName: "아이폰 15", conditionId: "good" },
  };
}

function viewFor(
  partial: Partial<MarketHandshakeRecord>,
  viewerUserId: string,
  now = new Date("2026-06-26T10:00:00+09:00"),
) {
  const record = buildMarketTradeSessionRecord({
    handshake: handshake(partial),
    listing: listing(),
    viewerUserId,
  });
  assert.ok(record, "record");
  return buildMarketTradeSessionView(record, marketTradeSessionCopy, now);
}

const schedulingSeeker = viewFor(
  {
    tradeStatus: "scheduling",
    schedulingExpiresAtIso: new Date("2026-06-27T10:00:00+09:00").toISOString(),
  },
  SEEKING_USER,
);
assert.equal(schedulingSeeker.showPickDay, true);
assert.equal(schedulingSeeker.showProposeSchedule, false);
assert.equal(schedulingSeeker.showAcceptProposal, false);

const schedulingListing = viewFor(
  {
    tradeStatus: "scheduling",
    schedulingExpiresAtIso: new Date("2026-06-27T10:00:00+09:00").toISOString(),
  },
  LISTING_USER,
);
assert.equal(schedulingListing.showPickDay, false);
assert.equal(schedulingListing.showProposeSchedule, false);

const buyerPicked = viewFor(
  {
    tradeStatus: "buyer_picked_day",
    preferredMeetDateKey: "2026-06-27",
    schedulingExpiresAtIso: new Date("2026-06-27T10:00:00+09:00").toISOString(),
  },
  LISTING_USER,
);
assert.equal(buyerPicked.showProposeSchedule, true);
assert.equal(buyerPicked.showPickDay, false);

const sellerProposed = viewFor(
  {
    tradeStatus: "seller_proposed",
    meetAtIso: new Date("2026-06-27T14:00:00+09:00").toISOString(),
    meetPlaceLabel: "강남역 2번 출구",
  },
  SEEKING_USER,
);
assert.equal(sellerProposed.showAcceptProposal, true);
assert.equal(sellerProposed.showCancelReservation, true);
assert.ok(sellerProposed.meetAtLabelKo);

const meetAt = new Date("2026-06-26T14:00:00+09:00");
const confirmedSeeker = viewFor(
  {
    tradeStatus: "confirmed",
    meetAtIso: meetAt.toISOString(),
    meetPlaceLabel: "강남역",
    meetLat: 37.5,
    meetLng: 127,
  },
  SEEKING_USER,
  new Date("2026-06-26T10:00:00+09:00"),
);
assert.equal(confirmedSeeker.showDepart, true);
assert.equal(confirmedSeeker.showNavigate, true);
assert.equal(
  confirmedSeeker.canDepart,
  isMarketTradeDepartWindowOpen(meetAt.toISOString(), new Date("2026-06-26T10:00:00+09:00")),
);
assert.equal(confirmedSeeker.showAcceptProposal, false);

const enRouteListing = viewFor(
  {
    tradeStatus: "en_route",
    meetAtIso: meetAt.toISOString(),
    meetPlaceLabel: "강남역",
    guestLat: 37.49,
    guestLng: 126.99,
    guestLocationAtIso: new Date("2026-06-26T13:30:00+09:00").toISOString(),
  },
  LISTING_USER,
  new Date("2026-06-26T13:30:00+09:00"),
);
assert.equal(enRouteListing.isEnRoute, true);
assert.ok(enRouteListing.statusHeadlineKo.length > 0);

console.log("test-market-trade-session-view: ok");
