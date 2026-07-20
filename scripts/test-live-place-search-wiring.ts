#!/usr/bin/env npx tsx
/**
 * Live lodging/eatery wiring — mapping + async search path (no network required).
 */

import assert from "node:assert/strict";
import { mapLodgingInventoryToPlaceHits } from "../lib/search-engine/map-lodging-inventory-to-hits";
import { mapRestaurantCandidatesToPlaceHits } from "../lib/search-engine/map-restaurant-candidates-to-hits";
import { invokeRimvioToolAsync } from "../lib/tool-registry";
import {
  clearSessionGraphs,
  resetGraphCommandStoreForTests,
  tryRunGraphCommandOsAsync,
} from "../lib/graph-command";
import { clearPreparedRealityOperations } from "../lib/reality-queue";
import { resolveBookingProviderForOperation } from "../lib/booking-runtime/resolve-booking-provider";
import type { RealityOperationV1 } from "../lib/reality-queue/types";

async function main(): Promise<void> {
  {
    const hits = mapLodgingInventoryToPlaceHits({
      query: "APA",
      anchorLat: 34.6654,
      anchorLng: 135.5019,
      limit: 2,
      rows: [
        {
          placeId: "liteapi:hotel-apa-1",
          name: "APA Hotel Osaka Namba",
          lat: 34.6654,
          lng: 135.5019,
          images: [],
          provider: "liteapi",
          liteapiHotelId: "hotel-apa-1",
          priceKrw: 98_000,
          roomOffers: [
            {
              id: "offer-1",
              title: "Standard",
              occupancyLabelKo: "성인 2명",
              priceKrw: 98_000,
              totalPriceKrw: 98_000,
              refundable: true,
              roomCount: 1,
              guestCount: 2,
              sourceLabelKo: "Nuitee Connect",
              providerOfferId: "offer-abc",
              providerRateId: "rate-1",
            },
          ],
        },
      ],
    });
    assert.equal(hits[0]?.source, "liteapi");
    assert.equal(hits[0]?.id, "liteapi:hotel-apa-1");
    assert.equal(hits[0]?.liteapiOfferId, "offer-abc");
    assert.equal(hits[0]?.reservable, true);
  }

  {
    const hits = mapRestaurantCandidatesToPlaceHits({
      query: "주변 맛집",
      anchorLat: 34.6654,
      anchorLng: 135.5019,
      candidates: [
        {
          source: "google_places",
          sourceLabel: "Google",
          placeId: "ChIJ_live_eat",
          name: "다루마",
          address: "Osaka",
          lat: 34.666,
          lng: 135.502,
          rating: 4.5,
          reviewCount: 200,
          openNow: true,
          phone: null,
          mapsUrl: "https://maps.google.com",
          images: [],
          specialReasonKo: null,
        },
      ],
    });
    assert.equal(hits[0]?.id, "maps:ChIJ_live_eat");
    assert.equal(hits[0]?.source, "maps");
  }

  {
    const op: RealityOperationV1 = {
      operationId: "op:lodging",
      type: "booking_prep",
      domain: "travel",
      status: "pending",
      contextEventId: "evt",
      contextLabelKo: null,
      labelKo: "APA",
      createdBy: "ai_assistant",
      preview: {
        titleKo: "APA",
        summaryKo: "prep",
        resourceId: "offer-abc",
      },
      needApproval: true,
      dependsOnItemIds: [],
      dependencyNoteKo: null,
      undoAllowed: true,
      expiresAtIso: null,
      sourceRef: "liteapi:hotel-apa-1",
      engineId: "liteapi_booking",
      kind: "lodging",
    };
    assert.equal(resolveBookingProviderForOperation(op), "liteapi_booking");
  }

  resetGraphCommandStoreForTests();
  clearPreparedRealityOperations();
  clearSessionGraphs();

  {
    const tool = await invokeRimvioToolAsync("hotel.lookup", {
      query: "APA 호텔",
      lat: 34.6654,
      lng: 135.5019,
    });
    assert.ok((tool.candidates?.length ?? 0) >= 1);
  }

  {
    const applied = await tryRunGraphCommandOsAsync({
      utterance: "주변 맛집 찾아줘",
      contextEventId: "evt-live-wire",
      anchorLat: 34.6654,
      anchorLng: 135.5019,
      contextLabelKo: "오사카",
    });
    assert.ok(applied);
    assert.ok(applied!.graph.nodes.some((n) => n.kind === "eatery"));
  }

  console.log("test-live-place-search-wiring: ok");
}

void main();
