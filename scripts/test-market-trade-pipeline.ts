import assert from "node:assert/strict";

import { filterOpportunityRowsExcludingActiveTrades } from "../lib/globe/opportunity-field/filter-rows-excluding-active-trades";
import {
  findMarketTradeSessionForPair,
  hasActiveMarketTradeForListing,
  isExplicitMarketTradePipeline,
  isMarketListingReservedForOthers,
  isMarketTradePipelineActive,
  isNonTerminalMarketTradeStatus,
  normalizeMarketTradeStatus,
  shouldIncludeInActiveMarketTradeList,
} from "../lib/globe/market/market-trade-pipeline";
import type { MarketTradeSessionView } from "../lib/globe/market/market-trade-types";
import type { OpportunityRow } from "../lib/globe/opportunity-field";

function sessionStub(
  overrides: Partial<MarketTradeSessionView> & {
    listingIntentId: string;
    seekingIntentId: string;
    tradeStatus: MarketTradeSessionView["tradeStatus"];
  },
): MarketTradeSessionView {
  return {
    handshakeId: "h1",
    threadId: "t1",
    phase: "active",
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
    availabilityPreset: "anytime",
    seekingConfirmedAtIso: null,
    listingConfirmedAtIso: null,
    viewerRole: "seeking",
    productTitle: "iPhone",
    priceLine: "50만원",
    photoUrl: null,
    updatedAtIso: new Date().toISOString(),
    roleBadgeKo: "",
    statusHeadlineKo: "",
    statusSublineKo: null,
    meetAtLabelKo: null,
    meetPlaceDisplay: null,
    proposalLineKo: null,
    progressSteps: [],
    activeStepId: "confirmed",
    countdownLabelKo: null,
    showNavigate: false,
    showDepart: false,
    canDepart: false,
    departOpensHintKo: null,
    isEnRoute: false,
    hostGuestEtaLabelKo: null,
    showProposePreferred: false,
    schedulingCountdownKo: null,
    showPickDay: false,
    showProposeSchedule: false,
    showAcceptProposal: false,
    showCancelReservation: false,
    cancelReasons: [],
    canConfirmHandshakeComplete: false,
    awaitingHandshakeOtherParty: false,
    handshakeCompleteCtaKo: null,
    ...overrides,
  };
}

function rowStub(listingId: string): OpportunityRow {
  return {
    listingId,
    title: "test",
    scorePct: 80,
    reasonsKo: [],
    listing: {
      id: listingId,
      role: "listing",
      active: true,
      userId: "seller",
      eventId: "e1",
      title: "test",
      categoryId: "electronics",
      placeLabel: "서울",
      anchorLat: 37.5,
      anchorLng: 127,
      radiusKm: 5,
      priceMinKrw: null,
      priceMaxKrw: null,
      detail: {},
      createdAtIso: "",
      updatedAtIso: "",
    },
  } as OpportunityRow;
}

assert.equal(normalizeMarketTradeStatus(null), "chat");
assert.equal(normalizeMarketTradeStatus("scheduling"), "scheduling");
assert.equal(isMarketTradePipelineActive("chat"), false);
assert.equal(isMarketTradePipelineActive("scheduling"), true);
assert.equal(
  isExplicitMarketTradePipeline({ tradeStatus: "scheduling", schedulingExpiresAtIso: null }),
  false,
);
assert.equal(
  isExplicitMarketTradePipeline({
    tradeStatus: "scheduling",
    schedulingExpiresAtIso: new Date(Date.now() + 3600_000).toISOString(),
  }),
  true,
);
assert.equal(isMarketListingReservedForOthers("seller_proposed"), false);
assert.equal(isMarketListingReservedForOthers("confirmed"), true);

assert.equal(
  shouldIncludeInActiveMarketTradeList({
    phase: "active",
    tradeStatus: "chat",
    schedulingExpiresAtIso: null,
  }),
  false,
);
assert.equal(
  shouldIncludeInActiveMarketTradeList({
    phase: "active",
    tradeStatus: "scheduling",
    schedulingExpiresAtIso: null,
  }),
  false,
  "orphan scheduling excluded from active list",
);
assert.equal(
  shouldIncludeInActiveMarketTradeList({
    phase: "active",
    tradeStatus: "scheduling",
    schedulingExpiresAtIso: new Date(Date.now() + 3600_000).toISOString(),
  }),
  true,
);
assert.equal(
  shouldIncludeInActiveMarketTradeList({
    phase: "pending_listing",
    tradeStatus: "confirmed",
    schedulingExpiresAtIso: null,
  }),
  false,
  "wrong handshake phase excluded",
);
assert.equal(
  shouldIncludeInActiveMarketTradeList({
    phase: "active",
    tradeStatus: "completed",
    schedulingExpiresAtIso: null,
  }),
  false,
);

const listingA = "listing-a";
const seeking1 = "seeking-1";
const seeking2 = "seeking-2";

const chatOnly = sessionStub({
  listingIntentId: listingA,
  seekingIntentId: seeking1,
  tradeStatus: "chat",
});
const scheduling = sessionStub({
  listingIntentId: listingA,
  seekingIntentId: seeking1,
  tradeStatus: "scheduling",
  schedulingExpiresAtIso: new Date(Date.now() + 3600_000).toISOString(),
});
const orphanScheduling = sessionStub({
  listingIntentId: listingA,
  seekingIntentId: seeking1,
  tradeStatus: "scheduling",
  schedulingExpiresAtIso: null,
});
const confirmedOther = sessionStub({
  listingIntentId: listingA,
  seekingIntentId: seeking2,
  tradeStatus: "confirmed",
});

assert.equal(
  hasActiveMarketTradeForListing([chatOnly], listingA, seeking1),
  false,
);
assert.equal(
  hasActiveMarketTradeForListing([orphanScheduling], listingA, seeking1),
  false,
  "orphan scheduling should not count as active trade",
);
assert.equal(
  hasActiveMarketTradeForListing([scheduling], listingA, seeking1),
  true,
);

const rows = [rowStub(listingA), rowStub("listing-b")];

assert.deepEqual(
  filterOpportunityRowsExcludingActiveTrades(rows, [chatOnly], seeking1),
  rows,
  "chat-only should not hide listing",
);

assert.deepEqual(
  filterOpportunityRowsExcludingActiveTrades(rows, [scheduling], seeking1).map(
    (row) => row.listingId,
  ),
  ["listing-b"],
  "scheduling hides for current seeker only",
);

assert.deepEqual(
  filterOpportunityRowsExcludingActiveTrades(rows, [confirmedOther], seeking1).map(
    (row) => row.listingId,
  ),
  ["listing-b"],
  "confirmed meet hides listing for everyone",
);

assert.equal(isNonTerminalMarketTradeStatus("chat"), true);
assert.equal(isNonTerminalMarketTradeStatus("completed"), false);
assert.equal(
  findMarketTradeSessionForPair(
    [
      sessionStub({
        handshakeId: "hs-1",
        listingIntentId: "listing-a",
        seekingIntentId: seeking1,
        tradeStatus: "chat",
      }),
    ],
    "listing-a",
    seeking1,
  )?.handshakeId,
  "hs-1",
);

console.log("test-market-trade-pipeline: ok");
