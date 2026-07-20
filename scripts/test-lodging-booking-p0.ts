import assert from "node:assert/strict";
import { deriveLodgingRoomOffers } from "../lib/globe/context-hub/derive-lodging-room-offers";
import {
  hasCompleteLodgingBookingSlots,
  readLodgingBookingSlots,
} from "../lib/globe/context-hub/lodging-booking-slots";
import { mapLodgingRowToContextResource, readLodgingPayloadFromResource } from "../lib/globe/context-hub/read-lodging-resource-inventory";
import type { EventCandidate } from "../lib/events/event-candidate";

const event = {
  id: "ec-trip",
  title: "도쿄 여행",
  category: "travel",
  source: "manual",
  lifecycle: "active",
  datetime: "2026-08-18T15:00:00.000Z",
  place: "도쿄",
  description: null,
  confidence: 1,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  metadata: {
    feedPlanEnabled: true,
    planWindowEndIso: "2026-08-21T11:00:00.000Z",
    planWindowConfidence: "confirmed",
    planNights: 3,
    contextLodgingGuestCount: 2,
    contextLodgingRoomCount: 1,
  },
} as unknown as EventCandidate;

const slots = readLodgingBookingSlots(event);
assert.equal(hasCompleteLodgingBookingSlots(slots), true);
assert.equal(slots.guestCount, 2);
assert.equal(slots.roomCount, 1);

const offers = deriveLodgingRoomOffers({
  row: {
    priceKrw: 140314,
    partnerLabel: "현재 맞춘 조건 기준",
    stayWindow: {
      checkInIso: "2026-08-18T15:00:00.000Z",
      checkOutIso: "2026-08-21T11:00:00.000Z",
      nights: 3,
      confidence: "confirmed",
    },
  },
  guestCount: 2,
  roomCount: 1,
});
assert.equal(offers.length, 3);
assert.equal(offers[0]?.guestCount, 2);
assert.ok((offers[0]?.totalPriceKrw ?? 0) > (offers[0]?.priceKrw ?? 0));

const resource = mapLodgingRowToContextResource(event, {
  placeId: "hotel-1",
  name: "인터시티 서울 호텔",
  lat: 37.5665,
  lng: 126.978,
  images: [],
  videoUrl: null,
  priceKrw: 140314,
  partnerLabel: "Agoda",
  address: "서울",
  mapsUrl: "https://example.com/hotel",
  provider: "mock",
  photoSource: "mock",
  photoConfidence: "mock",
  stayWindow: {
    checkInIso: "2026-08-18T15:00:00.000Z",
    checkOutIso: "2026-08-21T11:00:00.000Z",
    nights: 3,
    confidence: "confirmed",
  },
  checkInIso: "2026-08-18T15:00:00.000Z",
  checkOutIso: "2026-08-21T11:00:00.000Z",
});
const payload = readLodgingPayloadFromResource(resource);
assert.equal(payload?.roomOffers?.length, 3);
assert.equal(payload?.roomOffers?.[0]?.guestCount, 2);

console.log("test-lodging-booking-p0: ok");
