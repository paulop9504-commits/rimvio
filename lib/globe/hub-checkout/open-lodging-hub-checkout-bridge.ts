import type { HubLodgingCheckoutSession } from "@/lib/globe/hub-checkout/types";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { openLodgingCheckoutState } from "@/lib/globe/hub-checkout/lodging-checkout-controller";
import {
  pickLodgingCheckoutOffer,
  resolveLodgingHubCheckoutSession,
  resolveLodgingRoomCardStep,
  type ResolveLodgingHubCheckoutInput,
} from "@/lib/globe/hub-checkout/resolve-lodging-hub-checkout-session";

/** @deprecated Legacy event name — checkout now routes through lodging-checkout-controller. */
export const LODGING_HUB_CHECKOUT_OPEN_EVENT = "rimvio:open-lodging-hub-checkout";

export type LodgingHubCheckoutOpenDetail = ResolveLodgingHubCheckoutInput;

export type LodgingHubCheckoutOpenEventDetail = {
  session: HubLodgingCheckoutSession;
  placeId: string;
};

/** Open standard lodging checkout via the global host (single overlay). */
export function openLodgingHubCheckout(
  detail: LodgingHubCheckoutOpenDetail,
): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const contextEventId = detail.contextEventId.trim();
  const placeId = detail.placeId.trim();
  if (!contextEventId || !placeId) {
    return false;
  }

  const event = findLifeEventCandidate(contextEventId);
  if (!event) {
    return false;
  }

  const step = resolveLodgingRoomCardStep(event, placeId);
  if (!step) {
    return false;
  }

  const session = resolveLodgingHubCheckoutSession(detail);
  if (!session) {
    return false;
  }

  const offer = pickLodgingCheckoutOffer(step.payload.roomOffers, {
    offerId: detail.offerId,
    providerOfferId: detail.providerOfferId ?? detail.offerId,
  });
  if (!offer) {
    return false;
  }

  openLodgingCheckoutState({
    mode: "standard",
    session,
    ownerKey: `${step.contextEventId}:${step.resourceId}`,
    offerId: offer.id,
  });

  return true;
}

/** @deprecated Use subscribeLodgingCheckoutState + GlobeLodgingCheckoutHost. */
export function subscribeLodgingHubCheckoutOpen(
  _listener: (detail: LodgingHubCheckoutOpenEventDetail) => void,
): () => void {
  return () => {};
}
