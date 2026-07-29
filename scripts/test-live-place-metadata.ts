/**
 * Live place metadata — ratings / reviews / price from providers, not invent.
 * Run: npx tsx scripts/test-live-place-metadata.ts
 */

import assert from "node:assert/strict";
import { mapLodgingInventoryToPlaceHits } from "@/lib/search-engine/map-lodging-inventory-to-hits";
import { mapRestaurantCandidatesToPlaceHits } from "@/lib/search-engine/map-restaurant-candidates-to-hits";
import { mapLiteApiRatesToInventory } from "@/lib/globe/context-hub/providers/liteapi/map-liteapi-rates-to-inventory";
import {
  clearContextWorkspace,
  openMapContextWorkspace,
  readContextWorkspace,
} from "@/lib/context-workspace";
import { buildNodePreview } from "@/lib/context-workspace/build-node-preview";

function main() {
  {
    const hits = mapLodgingInventoryToPlaceHits({
      anchorLat: 37.56,
      anchorLng: 126.98,
      rows: [
        {
          placeId: "ChIJlive",
          name: "명동 라이브 호텔",
          lat: 37.563,
          lng: 126.987,
          images: ["https://example.com/h.jpg"],
          provider: "google_places",
          rating: 4.3,
          reviewCount: 1284,
          priceKrw: null,
        },
      ],
    });
    assert.equal(hits[0]?.rating, 4.3);
    assert.equal(hits[0]?.reviewCount, 1284);
    assert.equal(hits[0]?.thumbnailUrl, "https://example.com/h.jpg");
  }

  {
    const hits = mapRestaurantCandidatesToPlaceHits({
      query: "맛집",
      anchorLat: 37.56,
      anchorLng: 126.98,
      candidates: [
        {
          source: "google_places",
          sourceLabel: "Google",
          placeId: "ChIJeat",
          name: "을지로 식당",
          address: "서울",
          lat: 37.566,
          lng: 126.99,
          rating: 4.7,
          reviewCount: 902,
          openNow: true,
          phone: null,
          mapsUrl: null,
          images: [],
          priceLevel: 2,
        },
      ],
    });
    assert.equal(hits[0]?.rating, 4.7);
    assert.equal(hits[0]?.reviewCount, 902);
    assert.equal(hits[0]?.priceBand, 2);
  }

  {
    const rows = mapLiteApiRatesToInventory({
      guestCount: 2,
      roomCount: 1,
      checkInIso: "2026-08-01T15:00:00.000Z",
      checkOutIso: "2026-08-02T11:00:00.000Z",
      hotels: [
        {
          id: "h1",
          name: "Lite Live Hotel",
          latitude: 35.68,
          longitude: 139.76,
          rating: 4.1,
          stars: 4,
        },
      ],
      hotelRates: [
        {
          hotelId: "h1",
          roomTypes: [
            {
              name: "Standard",
              offerId: "off1",
              rates: [
                {
                  rateId: "r1",
                  name: "Room",
                  retailRate: { total: [{ amount: 120000, currency: "KRW" }] },
                },
              ],
            },
          ],
        },
      ],
    });
    assert.equal(rows[0]?.rating, 4.1);
    assert.equal(rows[0]?.priceKrw, 120000);
  }

  {
    const EVENT = "test-live-meta-ws";
    clearContextWorkspace(EVENT);
    openMapContextWorkspace({
      contextEventId: EVENT,
      domain: "lodging",
      query: "호텔",
      hits: [
        {
          id: "maps:live1",
          labelKo: "라이브 호텔",
          domain: "lodging",
          lat: 37.56,
          lng: 126.98,
          rating: 4.4,
          walkMinutes: null,
          reservable: true,
          localFavorite: false,
          priceBand: 2,
          source: "maps",
          reviewCount: 512,
          amountLabel: "98,000원",
        },
      ],
    });
    const ws = readContextWorkspace(EVENT)!;
    const node = ws.nodes[0]!;
    assert.equal(node.rating, 4.4);
    assert.equal(node.reviewCount, 512);
    assert.match(node.summaryKo, /★ 4\.4/);
    assert.match(node.summaryKo, /512/);
    assert.ok(!node.summaryKo.includes("가격대"));
    const preview = buildNodePreview(node, ws);
    assert.match(preview.ratingLabel, /4\.4/);
    assert.match(preview.reviewSummary, /512/);
    assert.equal(preview.nearby.length, 0);
    clearContextWorkspace(EVENT);
  }

  console.log("test-live-place-metadata: ok");
}

main();
