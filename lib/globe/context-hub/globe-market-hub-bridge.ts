import type { GlobePortalOpenRequest } from "@/lib/portal/globe-portal-open-bridge";
import { dispatchGlobePortalOpen } from "@/lib/portal/globe-portal-open-bridge";

export type GlobeMarketHubConnectRequest = {
  eventId: string;
};

export const GLOBE_MARKET_HUB_CONNECT = "rimvio-globe-market-hub-connect";

/** @deprecated — routes to Portal open (Intent-first). */
export function dispatchGlobeMarketHubConnect(
  detail: GlobeMarketHubConnectRequest,
): void {
  dispatchGlobePortalOpen({
    eventId: detail.eventId,
    source: "hub",
  } satisfies GlobePortalOpenRequest);
}

export function subscribeGlobeMarketHubConnect(
  handler: (detail: GlobeMarketHubConnectRequest) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const listener = (event: Event) => {
    const custom = event as CustomEvent<GlobeMarketHubConnectRequest>;
    const eventId = custom.detail?.eventId?.trim();
    if (!eventId) {
      return;
    }
    handler({ eventId });
  };
  window.addEventListener(GLOBE_MARKET_HUB_CONNECT, listener);
  return () => window.removeEventListener(GLOBE_MARKET_HUB_CONNECT, listener);
}
