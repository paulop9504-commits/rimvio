#!/usr/bin/env npx tsx
/**
 * Booking provider resolution + Maps hit mapping + fail-closed Commit invariants.
 */

import assert from "node:assert/strict";
import { resolveBookingProviderForOperation } from "../lib/booking-runtime/resolve-booking-provider";
import { executeGoogleMapsReserveBooking } from "../lib/booking-runtime/providers/google-maps-reserve";
import { executeBookingAfterHumanCommit } from "../lib/booking-runtime/execute-booking-after-commit";
import { executeBookingOperationsServer } from "../lib/booking-runtime/execute-booking-server";
import { mapRestaurantCandidatesToPlaceHits } from "../lib/search-engine/map-restaurant-candidates-to-hits";
import { runBookingPrepareAgent } from "../lib/agent-runtime";
import {
  clearPreparedRealityOperations,
  readPreparedRealityOperation,
} from "../lib/reality-queue";
import type { RealityOperationV1 } from "../lib/reality-queue/types";

async function main(): Promise<void> {
  {
    const hits = mapRestaurantCandidatesToPlaceHits({
      query: "주변 현지 맛집",
      anchorLat: 34.6654,
      anchorLng: 135.5019,
      localityMode: "local",
      candidates: [
        {
          source: "google_places",
          sourceLabel: "Google",
          placeId: "ChIJ_test_namba",
          name: "테스트 맛집",
          address: "Osaka",
          lat: 34.666,
          lng: 135.502,
          rating: 4.6,
          reviewCount: 120,
          openNow: true,
          phone: null,
          mapsUrl: "https://maps.google.com",
          images: [],
          specialReasonKo: "현지인 단골",
        },
      ],
    });
    assert.equal(hits[0]?.source, "maps");
    assert.equal(hits[0]?.id, "maps:ChIJ_test_namba");
    assert.equal(hits[0]?.localFavorite, true);
  }

  {
    const op: RealityOperationV1 = {
      operationId: "op:test",
      type: "booking_prep",
      domain: "travel",
      status: "pending",
      contextEventId: "evt",
      contextLabelKo: null,
      labelKo: "테스트 식당",
      createdBy: "ai_assistant",
      preview: {
        titleKo: "테스트",
        summaryKo: "테스트",
      },
      needApproval: true,
      dependsOnItemIds: [],
      dependencyNoteKo: null,
      undoAllowed: true,
      expiresAtIso: null,
      sourceRef: "maps:ChIJ_test",
      engineId: "google_maps_reserve",
      kind: "eatery",
    };
    assert.equal(resolveBookingProviderForOperation(op), "google_maps_reserve");
    const receipt = executeGoogleMapsReserveBooking({ operation: op });
    assert.ok(receipt);
    assert.equal(receipt!.provider, "google_maps_reserve");
    assert.equal(receipt!.status, "handoff");
    assert.ok(receipt!.handoffUrl?.includes("google.com/maps"));
  }

  {
    clearPreparedRealityOperations();
    const prepared = runBookingPrepareAgent({
      contextEventId: "evt-agent-offer",
      placeId: "liteapi:hotel-x",
      placeName: "테스트 호텔",
      kind: "lodging",
      liteapiOfferId: "offer-live-999",
      amountLabel: "20,000엔",
      bookingProvider: "liteapi_booking",
      utterance: "예약 가능 현지인",
    });
    assert.equal(prepared.ok, true);
    if (!prepared.ok) {
      throw new Error(prepared.reasonKo);
    }
    assert.equal(prepared.operation.preview.resourceId, "offer-live-999");
    assert.equal(prepared.operation.engineId, "liteapi_booking");

  const stored = readPreparedRealityOperation(prepared.operation.operationId);
  assert.equal(stored?.preview.resourceId, "offer-live-999");

  // Client → /api/reality/execute-booking payload carries offerId as resourceId.
  const apiPayloadPreview = {
    resourceId: prepared.operation.preview.resourceId ?? null,
    placeLabelKo: prepared.operation.preview.placeLabelKo ?? null,
  };
  assert.equal(apiPayloadPreview.resourceId, "offer-live-999");
  assert.equal(
    resolveBookingProviderForOperation(prepared.operation),
    "liteapi_booking",
  );

  // Sync fallback must refuse live providers (no silent demo_stub).
  const sync = executeBookingAfterHumanCommit({
    contextEventId: "evt-agent-offer",
    operations: [prepared.operation],
    approvedByHuman: true,
  });
  assert.equal(sync.ok, false);

    // Server fail-closed when LiteAPI needs identity / config.
    const server = await executeBookingOperationsServer({
      contextEventId: "evt-agent-offer",
      operations: [prepared.operation],
      approvedByHuman: true,
      identityBundle: null,
    });
    assert.equal(server.ok, false);
    if (!server.ok) {
      assert.match(server.reasonKo, /신원|LiteAPI|이메일|요금/u);
    }
  }

  {
    // demo_stub path still works for scripts without live providers.
    const stubOp: RealityOperationV1 = {
      operationId: "op:stub",
      type: "booking_prep",
      domain: "travel",
      status: "ready",
      contextEventId: "evt-stub",
      contextLabelKo: null,
      labelKo: "데모 장소",
      createdBy: "ai_assistant",
      preview: { titleKo: "데모", summaryKo: "데모" },
      needApproval: true,
      dependsOnItemIds: [],
      dependencyNoteKo: null,
      undoAllowed: true,
      expiresAtIso: null,
      sourceRef: "place:demo",
      engineId: "eatery_search",
      kind: "eatery",
    };
    assert.equal(resolveBookingProviderForOperation(stubOp), "demo_stub");
    const stub = executeBookingAfterHumanCommit({
      contextEventId: "evt-stub",
      operations: [stubOp],
      approvedByHuman: true,
    });
    assert.equal(stub.ok, true);
    if (stub.ok) {
      assert.equal(stub.receipts[0]?.provider, "demo_stub");
    }
  }

  console.log("ok — booking-live wiring");
}

void main();
