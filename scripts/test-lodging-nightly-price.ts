/**
 * Lodging nightly price display — stay total ÷ nights for cards.
 * Run: npx tsx scripts/test-lodging-nightly-price.ts
 */

import assert from "node:assert/strict";
import {
  formatHotelPriceDisplayKo,
  formatLodgingNightlyPriceLabelKo,
  resolveLodgingNightlyKrw,
  resolveStayNights,
  stripLodgingPerNightSuffix,
} from "@/lib/globe/context-hub/format-lodging-nightly-price";
import { mapLiteApiRatesToInventory } from "@/lib/globe/context-hub/providers/liteapi/map-liteapi-rates-to-inventory";
import { mapLodgingInventoryToPlaceHits } from "@/lib/search-engine/map-lodging-inventory-to-hits";

function main() {
  assert.equal(resolveStayNights({ nights: 3 }), 3);
  assert.equal(
    resolveStayNights({
      checkInIso: "2026-08-01T15:00:00.000Z",
      checkOutIso: "2026-08-04T11:00:00.000Z",
    }),
    3,
  );

  // Mock/derived: nightly + total
  assert.equal(
    resolveLodgingNightlyKrw({
      priceKrw: 100_000,
      totalPriceKrw: 300_000,
      nights: 3,
    }),
    100_000,
  );

  // LiteAPI legacy: both fields = stay total
  assert.equal(
    resolveLodgingNightlyKrw({
      priceKrw: 300_000,
      totalPriceKrw: 300_000,
      nights: 3,
    }),
    100_000,
  );

  assert.equal(
    formatLodgingNightlyPriceLabelKo(120_000),
    "120,000원",
  );
  assert.equal(stripLodgingPerNightSuffix("120,000원 / 1박"), "120,000원");
  assert.equal(
    formatHotelPriceDisplayKo("₩12만/박")?.amountKo,
    "₩12만",
  );

  {
    const rows = mapLiteApiRatesToInventory({
      guestCount: 2,
      roomCount: 1,
      checkInIso: "2026-08-01T15:00:00.000Z",
      checkOutIso: "2026-08-04T11:00:00.000Z",
      hotels: [
        {
          id: "h1",
          name: "Nightly Hotel",
          latitude: 35.68,
          longitude: 139.76,
          address: "Tokyo",
          main_photo: null,
          thumbnail: null,
          rating: 4.2,
          stars: 4,
        },
      ],
      hotelRates: [
        {
          hotelId: "h1",
          roomTypes: [
            {
              offerId: "off1",
              name: "Deluxe",
              rates: [
                {
                  rateId: "r1",
                  name: "Room only",
                  boardName: "RO",
                  mappedRoomId: null,
                  retailRate: {
                    total: [{ amount: 300_000, currency: "KRW" }],
                  },
                  cancellationPolicies: { refundableTag: "RFN" },
                },
              ],
            },
          ],
        },
      ],
    });
    assert.equal(rows[0]?.stayWindow?.nights, 3);
    assert.equal(rows[0]?.priceKrw, 100_000);
    assert.equal(rows[0]?.roomOffers?.[0]?.priceKrw, 100_000);
    assert.equal(rows[0]?.roomOffers?.[0]?.totalPriceKrw, 300_000);

    const hits = mapLodgingInventoryToPlaceHits({ rows });
    assert.equal(hits[0]?.amountLabel, "100,000원");
    assert.equal(hits[0]?.priceKrw, 100_000);
  }

  console.log("ok — lodging nightly price");
}

main();
