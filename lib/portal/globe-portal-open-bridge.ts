import type { PortalIntentId, PortalOpenSource } from "@/lib/portal/portal-types";

export type GlobePortalOpenRequest = {
  eventId?: string | null;
  composeText?: string;
  initialIntentId?: PortalIntentId;
  source?: PortalOpenSource;
};

export const GLOBE_PORTAL_OPEN = "rimvio-globe-portal-open";

export function dispatchGlobePortalOpen(detail: GlobePortalOpenRequest): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(GLOBE_PORTAL_OPEN, { detail }));
}

export function subscribeGlobePortalOpen(
  handler: (detail: GlobePortalOpenRequest) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const listener = (event: Event) => {
    const custom = event as CustomEvent<GlobePortalOpenRequest>;
    handler(custom.detail ?? {});
  };
  window.addEventListener(GLOBE_PORTAL_OPEN, listener);
  return () => window.removeEventListener(GLOBE_PORTAL_OPEN, listener);
}
