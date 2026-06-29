import type { MarketIntentDraft } from "@/lib/globe/market/market-intent-types";

export type GlobeMarketProjectionLaunchRequest = {
  draft: MarketIntentDraft;
  eventId: string;
  composeText?: string;
};

export const GLOBE_MARKET_PROJECTION_LAUNCH = "rimvio-globe-market-projection-launch";

export function dispatchGlobeMarketProjectionLaunch(
  detail: GlobeMarketProjectionLaunchRequest,
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(GLOBE_MARKET_PROJECTION_LAUNCH, { detail }),
  );
}

export function subscribeGlobeMarketProjectionLaunch(
  handler: (detail: GlobeMarketProjectionLaunchRequest) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const listener = (event: Event) => {
    const custom = event as CustomEvent<GlobeMarketProjectionLaunchRequest>;
    if (custom.detail?.draft && custom.detail?.eventId) {
      handler(custom.detail);
    }
  };
  window.addEventListener(GLOBE_MARKET_PROJECTION_LAUNCH, listener);
  return () => window.removeEventListener(GLOBE_MARKET_PROJECTION_LAUNCH, listener);
}
