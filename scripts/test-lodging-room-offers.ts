import assert from "node:assert/strict";
import {
  deriveLodgingRoomOffers,
  resolveLodgingRoomOffers,
} from "../lib/globe/context-hub/derive-lodging-room-offers";
import { mapLodgingRowToContextResource } from "../lib/globe/context-hub/read-lodging-resource-inventory";
import type { EventCandidate } from "../lib/events/event-candidate";

const stayWindow = {
  checkInIso: "2026-07-18T15:00:00.000Z",
  checkOutIso: "2026-07-21T11:00:00.000Z",
  nights: 3,
  confidence: "confirmed" as const,
};

assert.equal(
  deriveLodgingRoomOffers({
    row: { priceKrw: 100_000, provider: "liteapi", stayWindow },
    guestCount: 2,
    roomCount: 1,
  }).length,
  0,
  "LiteAPI must never use derived fallback cards",
);

assert.equal(
  deriveLodgingRoomOffers({
    row: { priceKrw: 100_000, provider: "google_places", stayWindow },
    guestCount: 2,
    roomCount: 1,
  }).length,
  0,
  "Google Places must never use derived fallback cards",
);

const mockDerived = deriveLodgingRoomOffers({
  row: { priceKrw: 140_314, provider: "mock", partnerLabel: "데모", stayWindow },
  guestCount: 2,
  roomCount: 1,
});
assert.equal(mockDerived.length, 3);
assert.match(mockDerived[0]?.title ?? "", /예상 옵션/);
assert.ok(!/싱글|더블|스위트/.test(mockDerived[0]?.title ?? ""));

const liveOffers = resolveLodgingRoomOffers({
  row: {
    placeId: "liteapi:lp1",
    name: "Hotel",
    lat: 35,
    lng: 139,
    images: [],
    provider: "liteapi",
    roomOffers: [
      {
        id: "liteapi-lp1-offer-rate",
        title: "Deluxe King · Room Only",
        occupancyLabelKo: "성인 2명 · 객실 1개",
        priceKrw: 90_000,
        totalPriceKrw: 90_000,
        refundable: true,
        roomCount: 1,
        guestCount: 2,
        sourceLabelKo: "Nuitee Connect",
        providerOfferId: "offer",
        providerRateId: "rate",
      },
    ],
  },
  guestCount: 2,
  roomCount: 1,
  stayWindow,
});
assert.equal(liveOffers.length, 1);
assert.equal(liveOffers[0]?.title, "Deluxe King · Room Only");

const event = {
  id: "evt-room-offers",
  title: "도쿄",
  datetime: stayWindow.checkInIso,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  metadata: {
    contextLodgingGuestCount: 2,
    contextLodgingRoomCount: 1,
  },
} as unknown as EventCandidate;

const liteapiEmpty = mapLodgingRowToContextResource(event, {
  placeId: "liteapi:lp1",
  name: "Hotel",
  lat: 35,
  lng: 139,
  images: ["https://example.com/hotel.jpg"],
  priceKrw: 90_000,
  provider: "liteapi",
  checkInIso: stayWindow.checkInIso,
  checkOutIso: stayWindow.checkOutIso,
  stayWindow,
});
const liteapiPayload = liteapiEmpty.metadata?.lodging as {
  roomOffers?: unknown[];
};
assert.equal(liteapiPayload.roomOffers?.length ?? 0, 0, "LiteAPI without rates shows no fake cards");

const mockResource = mapLodgingRowToContextResource(event, {
  placeId: "mock-hotel",
  name: "데모 호텔",
  lat: 37.5,
  lng: 127,
  images: [],
  priceKrw: 140_314,
  provider: "mock",
  checkInIso: stayWindow.checkInIso,
  checkOutIso: stayWindow.checkOutIso,
  stayWindow,
});
const mockPayload = mockResource.metadata?.lodging as {
  roomOffers?: Array<{ title?: string }>;
};
assert.equal(mockPayload.roomOffers?.length, 3);

console.log("test-lodging-room-offers: ok");
