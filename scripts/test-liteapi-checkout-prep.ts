import assert from "node:assert/strict";

import { loadEnvLocal } from "../lib/test/load-env-local";
import { prepareLodgingHubCheckout } from "../lib/globe/hub-checkout/prepare-lodging-hub-checkout";
import { buildLiteApiGuestPayload } from "../lib/globe/context-hub/providers/liteapi/build-liteapi-guest-payload";
import type { IdentityVaultBundle } from "../lib/identity-vault/types";

loadEnvLocal();

const bundle: IdentityVaultBundle = {
  traveler: {
    version: 1,
    givenNameRoman: "MINJI",
    familyNameRoman: "KIM",
    dateOfBirth: "1992-04-12",
    nationalityIso2: "KR",
  },
  contact: {
    version: 1,
    phoneE164: "+821012345678",
    email: "minji@example.com",
  },
};

const guest = buildLiteApiGuestPayload(bundle);
assert.ok(guest);
assert.equal(guest?.holder.email, "minji@example.com");

const liteSession = prepareLodgingHubCheckout({
  contextEventId: "evt-lite",
  resourceId: "res-lite",
  payload: {
    placeId: "liteapi:lp1897",
    name: "테스트 호텔",
    images: [],
    provider: "liteapi",
    priceKrw: 180000,
    stayWindow: {
      checkInIso: "2026-08-01T15:00:00.000Z",
      checkOutIso: "2026-08-03T11:00:00.000Z",
    },
    roomOffers: [],
  },
  offer: {
    id: "liteapi-lp1897-1",
    title: "더블",
    occupancyLabelKo: "성인 2명",
    totalPriceKrw: 360000,
    priceKrw: 180000,
    guestCount: 2,
    refundable: true,
    sourceLabelKo: "Nuitee Connect",
    providerOfferId: "test-offer-id",
  },
});

assert.equal(liteSession?.checkoutProvider, "liteapi");
assert.equal(liteSession?.liteapiOfferId, "test-offer-id");

const pgSession = prepareLodgingHubCheckout({
  contextEventId: "evt-pg",
  resourceId: "res-pg",
  payload: {
    placeId: "place-1",
    name: "모텔",
    images: [],
    provider: "google_places",
    priceKrw: 90000,
    stayWindow: {
      checkInIso: "2026-08-01T15:00:00.000Z",
      checkOutIso: "2026-08-02T11:00:00.000Z",
    },
    roomOffers: [],
  },
  offer: {
    id: "room-1",
    title: "스탠다드",
    occupancyLabelKo: "성인 2명",
    totalPriceKrw: 90000,
    priceKrw: 90000,
    guestCount: 2,
    refundable: true,
    sourceLabelKo: "직접",
  },
});

assert.equal(pgSession?.checkoutProvider, "rimvio_pg");

console.log("test-liteapi-checkout-prep: ok");
