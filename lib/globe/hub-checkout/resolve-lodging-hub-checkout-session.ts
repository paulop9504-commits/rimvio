import type { EventCandidate } from "@/lib/events/event-candidate";
import type { LodgingResourcePayload } from "@/lib/globe/context-hub/lodging-resource-types";
import {
  mapLodgingRowToContextResource,
  readLodgingInventoryRows,
  readLodgingPayloadFromResource,
} from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { prepareLodgingHubCheckout } from "@/lib/globe/hub-checkout/prepare-lodging-hub-checkout";
import type { HubLodgingCheckoutSession } from "@/lib/globe/hub-checkout/types";
import { findLifeEventCandidate } from "@/lib/life-read-model";

export type ResolveLodgingHubCheckoutInput = {
  contextEventId: string;
  placeId: string;
  offerId?: string | null;
};

export type LodgingRoomCardStep = {
  contextEventId: string;
  resourceId: string;
  payload: LodgingResourcePayload;
};

export function resolveLodgingRoomCardStep(
  event: EventCandidate,
  placeId: string,
): LodgingRoomCardStep | null {
  const row = readLodgingInventoryRows(event).find(
    (entry) => entry.placeId === placeId.trim(),
  );
  if (!row) {
    return null;
  }
  const resource = mapLodgingRowToContextResource(event, row);
  const payload = readLodgingPayloadFromResource(resource);
  if (!payload?.roomOffers?.length) {
    return null;
  }
  return {
    contextEventId: event.id,
    resourceId: resource.resourceId,
    payload,
  };
}

/** Pinned lodging row → checkout session (first or selected offer). */
export function resolveLodgingHubCheckoutSession(
  input: ResolveLodgingHubCheckoutInput,
): HubLodgingCheckoutSession | null {
  const contextEventId = input.contextEventId.trim();
  const placeId = input.placeId.trim();
  if (!contextEventId || !placeId) {
    return null;
  }
  const event = findLifeEventCandidate(contextEventId);
  if (!event) {
    return null;
  }
  const step = resolveLodgingRoomCardStep(event, placeId);
  if (!step) {
    return null;
  }
  const offer =
    step.payload.roomOffers?.find((row) => row.id === input.offerId) ??
    step.payload.roomOffers?.[0];
  if (!offer) {
    return null;
  }
  return prepareLodgingHubCheckout({
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
      providerOfferId: offer.providerOfferId ?? null,
    },
    offerImages: offer.imageUrls,
  });
}
