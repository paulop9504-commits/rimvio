import assert from "node:assert/strict";
import { prepareLodgingHubCheckout } from "../lib/globe/hub-checkout/prepare-lodging-hub-checkout";
import { executeLodgingHubCheckout } from "../lib/globe/hub-checkout/execute-lodging-hub-checkout";
import type { IdentityVaultBundle } from "../lib/identity-vault/types";
import { readHubActionLog } from "../lib/globe/resource/hub-action-record-store";

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

async function main(): Promise<void> {
  const session = prepareLodgingHubCheckout({
    contextEventId: "evt-checkout",
    resourceId: "res-lodging-1",
    payload: {
      placeId: "place-hotel-1",
      name: "테스트 호텔",
      images: [],
      mapsUrl: "https://example.com/hotel",
      priceKrw: 120000,
      stayWindow: {
        checkInIso: "2026-07-18T15:00:00.000Z",
        checkOutIso: "2026-07-21T11:00:00.000Z",
      },
      roomOffers: [],
    },
    offer: {
      id: "room-deluxe",
      title: "디럭스 더블",
      occupancyLabelKo: "성인 2명",
      totalPriceKrw: 360000,
      priceKrw: 120000,
      guestCount: 2,
      refundable: true,
      sourceLabelKo: "직접",
    },
  });

  assert.ok(session);
  assert.equal(session?.amountKrw, 360000);
  assert.ok(session?.handoffHref.includes("http"));

  const result = await executeLodgingHubCheckout({
    session: session!,
    identityBundle: bundle,
    paymentMethod: "in_app_card",
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.purchaseDeferred, false);
    assert.ok(result.externalRef.startsWith("rimvio_checkout:mock:"));
    const log = readHubActionLog("evt-checkout");
    assert.equal(log.length, 2);
    assert.equal(log[0]?.type, "reserve");
    assert.equal(log[1]?.type, "purchase");
    if (log[1]?.type === "purchase") {
      assert.equal(log[1].status, "success");
      assert.equal(log[1].externalRef, result.externalRef);
      assert.equal(
        (log[1].payload as { passportNumber?: string }).passportNumber,
        undefined,
      );
    }
  }

  console.log("test-hub-checkout: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
