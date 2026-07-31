import type { EventCandidate } from "@/lib/events/event-candidate";
import type { LodgingResourcePayload } from "@/lib/globe/context-hub/lodging-resource-types";
import {
  mapLodgingRowToContextResource,
  readLodgingInventoryRows,
  readLodgingPayloadFromResource,
} from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { synthesizeCheckoutRoomOffer } from "@/lib/globe/context-hub/derive-lodging-room-offers";
import { readLodgingBookingSlots } from "@/lib/globe/context-hub/lodging-booking-slots";
import { prepareLodgingHubCheckout } from "@/lib/globe/hub-checkout/prepare-lodging-hub-checkout";
import type {
  HubLodgingCheckoutSession,
  LiteApiLockedPrebook,
  LodgingCheckoutOfferWire,
} from "@/lib/globe/hub-checkout/types";
import { findLifeEventCandidate } from "@/lib/life-read-model";

export type ResolveLodgingHubCheckoutInput = {
  contextEventId: string;
  placeId: string;
  offerId?: string | null;
  /** LiteAPI provider offer id (preferred over card row id). */
  providerOfferId?: string | null;
  liteapiLockedPrebook?: LiteApiLockedPrebook | null;
};

export type LodgingRoomCardStep = {
  contextEventId: string;
  resourceId: string;
  payload: LodgingResourcePayload;
};

type OfferPick = {
  readonly id: string;
  readonly title: string;
  readonly occupancyLabelKo: string;
  readonly totalPriceKrw: number | null;
  readonly priceKrw: number | null;
  readonly guestCount: number;
  readonly refundable: boolean;
  readonly sourceLabelKo: string;
  readonly providerOfferId?: string | null;
  readonly imageUrls?: readonly string[];
};

export function pickLodgingCheckoutOffer(
  offers: readonly OfferPick[] | null | undefined,
  ids: {
    readonly offerId?: string | null;
    readonly providerOfferId?: string | null;
  },
): OfferPick | null {
  if (!offers || offers.length === 0) {
    return null;
  }
  const providerOfferId = ids.providerOfferId?.trim() || null;
  const offerId = ids.offerId?.trim() || null;
  if (providerOfferId) {
    const byProvider = offers.find(
      (row) => row.providerOfferId?.trim() === providerOfferId,
    );
    if (byProvider) {
      return byProvider;
    }
  }
  if (offerId) {
    const byId = offers.find((row) => row.id === offerId);
    if (byId) {
      return byId;
    }
    const byProviderFallback = offers.find(
      (row) => row.providerOfferId?.trim() === offerId,
    );
    if (byProviderFallback) {
      return byProviderFallback;
    }
  }
  return offers[0] ?? null;
}

export function resolveLodgingRoomCardStep(
  event: EventCandidate,
  placeId: string,
): LodgingRoomCardStep | null {
  const needle = placeId.trim();
  const strip = (id: string) => {
    if (id.startsWith("liteapi:")) return id.slice("liteapi:".length);
    if (id.startsWith("maps:")) return id.slice("maps:".length);
    return id;
  };
  const match = (rowPlaceId: string) => {
    const a = rowPlaceId.trim();
    if (!a || !needle) return false;
    if (a === needle) return true;
    return strip(a) === strip(needle);
  };
  const row = readLodgingInventoryRows(event).find(
    (entry) =>
      match(entry.placeId) ||
      (entry.liteapiHotelId != null && match(entry.liteapiHotelId)),
  );
  if (!row) {
    return null;
  }
  const resource = mapLodgingRowToContextResource(event, row);
  const payload = readLodgingPayloadFromResource(resource);
  if (!payload) {
    return null;
  }
  if (payload.roomOffers && payload.roomOffers.length > 0) {
    return {
      contextEventId: event.id,
      resourceId: resource.resourceId,
      payload,
    };
  }
  // Places / no-rate rows: synthesize one checkout offer so 예매 opens the card.
  const slots = readLodgingBookingSlots(event);
  const synthetic = synthesizeCheckoutRoomOffer({
    row,
    guestCount: slots.guestCount ?? 1,
    roomCount: slots.roomCount ?? 1,
  });
  if (!synthetic) {
    return null;
  }
  return {
    contextEventId: event.id,
    resourceId: resource.resourceId,
    payload: {
      ...payload,
      roomOffers: [synthetic],
    },
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
  const offer = pickLodgingCheckoutOffer(step.payload.roomOffers, {
    offerId: input.offerId,
    providerOfferId: input.providerOfferId ?? input.offerId,
  });
  if (!offer) {
    return null;
  }
  const wire: LodgingCheckoutOfferWire = {
    id: offer.id,
    title: offer.title,
    occupancyLabelKo: offer.occupancyLabelKo,
    totalPriceKrw: offer.totalPriceKrw ?? null,
    priceKrw: offer.priceKrw ?? null,
    guestCount: offer.guestCount,
    refundable: offer.refundable,
    sourceLabelKo: offer.sourceLabelKo,
    providerOfferId: offer.providerOfferId ?? null,
  };
  const session = prepareLodgingHubCheckout({
    contextEventId: step.contextEventId,
    resourceId: step.resourceId,
    payload: step.payload,
    offer: wire,
    offerImages: offer.imageUrls,
  });
  if (!session) {
    return null;
  }
  if (!input.liteapiLockedPrebook) {
    return session;
  }
  return {
    ...session,
    liteapiLockedPrebook: input.liteapiLockedPrebook,
    liteapiOfferId:
      session.liteapiOfferId ??
      input.providerOfferId?.trim() ??
      input.offerId?.trim() ??
      null,
    checkoutProvider: "liteapi",
  };
}
