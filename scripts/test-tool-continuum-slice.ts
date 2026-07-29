#!/usr/bin/env npx tsx
/**
 * Tool continuum slice:
 * - maps.navigate / calendar.add registry
 * - pending_payment → Hub locked prebook wire
 */

import assert from "node:assert/strict";
import { invokeRimvioTool } from "../lib/tool-registry";
import { resolveToolIdForIntent } from "../lib/rule-engine/resolve-tool-id";
import { tryRunSoftSurfaceCommand } from "../lib/rule-engine/try-run-soft-surface-command";
import {
  clearSessionGraphs,
  resetGraphCommandStoreForTests,
  tryRunGraphCommandOs,
} from "../lib/graph-command";
import { clearPreparedRealityOperations } from "../lib/reality-queue";
import { pickLodgingCheckoutOffer } from "../lib/globe/hub-checkout/resolve-lodging-hub-checkout-session";
import { lockedPrebookFromBookingReceipt } from "../lib/globe/hub-checkout/open-lodging-hub-checkout-from-pending-payment";
import type { BookingCommitReceipt } from "../lib/booking-runtime/types";
import { OSAKA_APA_NAMBA } from "../lib/search-engine/osaka-demo-catalog";

assert.equal(resolveToolIdForIntent({ intent: "Navigate" }), "maps.navigate");
assert.equal(resolveToolIdForIntent({ intent: "Calendar" }), "calendar.add");

{
  const nav = invokeRimvioTool("maps.navigate", {
    lat: 34.6654,
    lng: 135.5019,
    placeName: "APA 난바",
    utterance: "택시로 가줘",
  });
  assert.ok(nav.mapsUrl?.includes("google.com/maps/dir"));
  assert.ok(nav.mapsUrl?.includes("travelmode=driving"));
  assert.match(nav.summaryKo, /APA 난바/);
}

{
  clearPreparedRealityOperations();
  const cal = invokeRimvioTool("calendar.add", {
    contextEventId: "evt-cal-tool",
    placeName: "APA 난바",
    placeId: "liteapi:apa",
  });
  assert.equal(cal.waitingCommit, true);
  assert.ok(cal.reservedOpIds?.length === 1);
  assert.match(cal.summaryKo, /결재함/);
}

{
  resetGraphCommandStoreForTests();
  clearSessionGraphs();
  clearPreparedRealityOperations();
  const pin = tryRunGraphCommandOs({
    utterance: "APA호텔 고정",
    contextEventId: "evt-soft-tools",
    contextLabelKo: "오사카",
    anchorLat: OSAKA_APA_NAMBA.lat,
    anchorLng: OSAKA_APA_NAMBA.lng,
  });
  assert.ok(pin);
  const soft = tryRunSoftSurfaceCommand({
    utterance: "길 찾아줘",
    graph: pin!.graph,
    contextEventId: "evt-soft-tools",
  });
  assert.ok(soft);
  assert.equal(soft!.kind, "navigate");
  assert.ok(soft!.mapsUrl?.includes("google.com/maps"));
}

{
  const offer = pickLodgingCheckoutOffer(
    [
      {
        id: "card-1",
        title: "A",
        occupancyLabelKo: "2인",
        totalPriceKrw: 100_000,
        priceKrw: 100_000,
        guestCount: 2,
        refundable: true,
        sourceLabelKo: "LiteAPI",
        providerOfferId: "offer-live-1",
      },
      {
        id: "card-2",
        title: "B",
        occupancyLabelKo: "2인",
        totalPriceKrw: 120_000,
        priceKrw: 120_000,
        guestCount: 2,
        refundable: false,
        sourceLabelKo: "LiteAPI",
        providerOfferId: "offer-live-2",
      },
    ],
    { offerId: "offer-live-2", providerOfferId: "offer-live-2" },
  );
  assert.equal(offer?.id, "card-2");
}

{
  const receipt: BookingCommitReceipt = {
    operationId: "op:1",
    placeId: "liteapi:hotel",
    placeName: "호텔",
    provider: "liteapi_booking",
    confirmationCode: "pb-1",
    status: "pending_payment",
    committedAtIso: new Date().toISOString(),
    meta: {
      prebookId: "pb-1",
      transactionId: "tx-1",
      offerId: "offer-x",
      secretKey: "sk_test",
      publicKey: "sandbox",
    },
  };
  const locked = lockedPrebookFromBookingReceipt(receipt);
  assert.ok(locked);
  assert.equal(locked!.prebookId, "pb-1");
  assert.equal(locked!.secretKey, "sk_test");
  assert.equal(locked!.publicKey, "sandbox");
}

console.log("ok — tool continuum navigate/calendar/pending-payment");
