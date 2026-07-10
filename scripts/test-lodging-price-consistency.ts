import assert from "node:assert/strict";
import { deriveLodgingRoomOffers } from "../lib/globe/context-hub/derive-lodging-room-offers";
import { buildLodgingStayWindow } from "../lib/globe/context-hub/lodging-stay-window";
import {
  CONTEXT_LODGING_HUB_ENABLED_META_KEY,
  CONTEXT_LODGING_INVENTORY_META_KEY,
} from "../lib/globe/context-hub/lodging-resource-types";
import {
  mapLodgingRowToContextResource,
  readLodgingInventoryRows,
} from "../lib/globe/context-hub/read-lodging-resource-inventory";
import { prepareLodgingHubCheckout } from "../lib/globe/hub-checkout/prepare-lodging-hub-checkout";
import type { EventCandidate } from "../lib/events/event-candidate";

const cardPriceKrw = 51_162;
const checkoutDates = {
  checkInIso: "2026-07-16T15:00:00.000Z",
  checkOutIso: "2026-07-17T11:00:00.000Z",
};

const event = {
  id: "evt-price-consistency",
  title: "오사카",
  datetime: checkoutDates.checkInIso,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  metadata: {
    planWindowEndIso: "2026-07-18T11:00:00.000Z",
    planNights: 2,
    contextLodgingGuestCount: 1,
    contextLodgingRoomCount: 1,
    [CONTEXT_LODGING_HUB_ENABLED_META_KEY]: true,
    [CONTEXT_LODGING_INVENTORY_META_KEY]: [
      {
        placeId: "liteapi:lp123",
        name: "HOTEL MYSTAYS Sakaisuji Honmachi",
        lat: 34.68,
        lng: 135.5,
        images: ["https://example.com/hotel.jpg"],
        priceKrw: cardPriceKrw,
        partnerLabel: "Nuitee Connect",
        provider: "liteapi",
        liteapiHotelId: "lp123",
        checkInIso: checkoutDates.checkInIso,
        checkOutIso: checkoutDates.checkOutIso,
        roomOffers: [
          {
            id: "liteapi-lp123-1",
            title: "Single Room · Room Only",
            occupancyLabelKo: "성인 1명 · 객실 1개",
            priceKrw: cardPriceKrw,
            totalPriceKrw: cardPriceKrw,
            refundable: true,
            roomCount: 1,
            guestCount: 1,
            sourceLabelKo: "Nuitee Connect",
            providerOfferId: "offer-abc",
            providerRateId: "rate-xyz",
          },
        ],
      },
    ],
  },
} as unknown as EventCandidate;

const stayWindow = buildLodgingStayWindow({
  event,
  row: {
    checkInIso: checkoutDates.checkInIso,
    checkOutIso: checkoutDates.checkOutIso,
  },
});
assert.equal(stayWindow?.nights, 1, "lodging checkout dates should win over planNights");

const [row] = readLodgingInventoryRows(event);
assert.ok(row?.roomOffers?.length, "inventory round-trip should keep roomOffers");
assert.equal(row?.roomOffers?.[0]?.providerOfferId, "offer-abc");

const resource = mapLodgingRowToContextResource(event, row!);
const payload = resource.metadata?.lodging as {
  roomOffers?: Array<{ totalPriceKrw?: number | null; title?: string }>;
  priceKrw?: number;
};
assert.equal(payload.priceKrw, cardPriceKrw);
assert.equal(payload.roomOffers?.[0]?.totalPriceKrw, cardPriceKrw);
assert.notEqual(payload.roomOffers?.[0]?.title, "싱글 객실", "should use live LiteAPI offer");

const offer = payload.roomOffers![0]!;
const session = prepareLodgingHubCheckout({
  contextEventId: event.id,
  resourceId: resource.resourceId,
  payload: payload as never,
  offer: {
    id: offer.id ?? "liteapi-lp123-1",
    title: offer.title ?? "Single Room",
    occupancyLabelKo: "성인 1명 · 객실 1개",
    totalPriceKrw: offer.totalPriceKrw ?? null,
    priceKrw: cardPriceKrw,
    guestCount: 1,
    refundable: true,
    sourceLabelKo: "Nuitee Connect",
    providerOfferId: "offer-abc",
  },
});
assert.equal(session?.amountKrw, cardPriceKrw);

const derived = deriveLodgingRoomOffers({
  row: {
    priceKrw: cardPriceKrw,
    partnerLabel: "Nuitee Connect",
    provider: "liteapi",
    stayWindow: stayWindow!,
  },
  guestCount: 1,
  roomCount: 1,
});
assert.equal(derived.length, 0, "LiteAPI must not derive fallback room cards");

console.log("test-lodging-price-consistency: ok");
