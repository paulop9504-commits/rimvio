import assert from "node:assert/strict";
import {
  buildContextLodgingHubCheckoutHandoff,
} from "../lib/globe/context-action-injection/build-context-action-handoff";
import {
  resolveLodgingRoomCardStep,
} from "../lib/globe/hub-checkout/resolve-lodging-hub-checkout-session";
import { prepareLodgingHubCheckout } from "../lib/globe/hub-checkout/prepare-lodging-hub-checkout";
import { mapLodgingRowToContextResource } from "../lib/globe/context-hub/read-lodging-resource-inventory";
import type { EventCandidate } from "../lib/events/event-candidate";
import type { ContextLodgingInventoryRow } from "../lib/globe/context-hub/lodging-resource-types";
import {
  CONTEXT_LODGING_HUB_ENABLED_META_KEY,
  CONTEXT_LODGING_INVENTORY_META_KEY,
} from "../lib/globe/context-hub/lodging-resource-types";

const row: ContextLodgingInventoryRow = {
  placeId: "lodging-test-1",
  name: "테스트 호텔",
  lat: 34.6937,
  lng: 135.5023,
  priceKrw: 98000,
  partnerLabel: "mock",
  address: "오사카",
  mapsUrl: null,
  provider: "mock",
  images: [],
  checkInIso: "2026-07-10",
  checkOutIso: "2026-07-12",
};

const event = {
  id: "evt-lodging-checkout-e2e",
  title: "오사카",
  datetime: "2026-07-10T00:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  metadata: {
    [CONTEXT_LODGING_HUB_ENABLED_META_KEY]: true,
    [CONTEXT_LODGING_INVENTORY_META_KEY]: [row],
    contextLodgingGuestCount: 2,
    contextLodgingRoomCount: 1,
    planWindowEndIso: "2026-07-12T00:00:00.000Z",
    planNights: 2,
  },
} as unknown as EventCandidate;

const resource = mapLodgingRowToContextResource(event, row);
assert.equal(resource.kind, "lodging_voucher");

const step = resolveLodgingRoomCardStep(event, row.placeId);
assert.ok(step);
assert.ok(step.payload.roomOffers?.length);

const offer = step.payload.roomOffers![0];
const session = prepareLodgingHubCheckout({
  contextEventId: step.contextEventId,
  resourceId: step.resourceId,
  payload: step.payload,
  offer: {
    id: offer.id,
    title: offer.title,
    occupancyLabelKo: offer.occupancyLabelKo,
    totalPriceKrw: offer.totalPriceKrw ?? null,
    priceKrw: offer.priceKrw ?? null,
    guestCount: offer.guestCount,
    refundable: offer.refundable,
    sourceLabelKo: offer.sourceLabelKo,
  },
});
assert.ok(session);
assert.equal(session!.amountKrw > 0, true);
assert.equal(session!.propertyName, "테스트 호텔");

const handoff = buildContextLodgingHubCheckoutHandoff({
  intent: {
    kind: "book_lodging",
    resourceKind: "lodging",
    confidence: 1,
  },
});
assert.equal(handoff.href, "rimvio://hub/lodging-checkout");
assert.equal(handoff.internalRoute, true);

console.log("test-lodging-scout-checkout-e2e: ok");
