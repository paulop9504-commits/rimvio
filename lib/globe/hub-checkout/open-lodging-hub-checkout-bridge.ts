import type { HubLodgingCheckoutSession } from "@/lib/globe/hub-checkout/types";
import {
  resolveLodgingHubCheckoutSession,
  type ResolveLodgingHubCheckoutInput,
} from "@/lib/globe/hub-checkout/resolve-lodging-hub-checkout-session";

export const LODGING_HUB_CHECKOUT_OPEN_EVENT = "rimvio:open-lodging-hub-checkout";

export type LodgingHubCheckoutOpenDetail = ResolveLodgingHubCheckoutInput;

export type LodgingHubCheckoutOpenEventDetail = {
  session: HubLodgingCheckoutSession;
  placeId: string;
};

export function openLodgingHubCheckout(detail: LodgingHubCheckoutOpenDetail): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const session = resolveLodgingHubCheckoutSession(detail);
  if (!session) {
    return false;
  }
  window.dispatchEvent(
    new CustomEvent<LodgingHubCheckoutOpenEventDetail>(
      LODGING_HUB_CHECKOUT_OPEN_EVENT,
      {
        detail: {
          session,
          placeId: detail.placeId.trim(),
        },
      },
    ),
  );
  return true;
}

export function subscribeLodgingHubCheckoutOpen(
  listener: (detail: LodgingHubCheckoutOpenEventDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<LodgingHubCheckoutOpenEventDetail>).detail;
    if (detail?.session) {
      listener(detail);
    }
  };
  window.addEventListener(LODGING_HUB_CHECKOUT_OPEN_EVENT, handler);
  return () => window.removeEventListener(LODGING_HUB_CHECKOUT_OPEN_EVENT, handler);
}
