/** Staged eatery pin reveal + chat summary after composer discovery. */

export const GLOBE_EATERY_DISCOVERY_START = "rimvio:globe-eatery-discovery-start";
export const GLOBE_EATERY_DISCOVERY_REVEAL = "rimvio:globe-eatery-discovery-reveal";
export const GLOBE_EATERY_DISCOVERY_SUMMARY = "rimvio:globe-eatery-discovery-summary";
export const GLOBE_EATERY_DISCOVERY_SESSION = "rimvio:globe-eatery-discovery-session";
export const GLOBE_EATERY_DISCOVERY_CLOSE = "rimvio:globe-eatery-discovery-close";

import type { GlobeEateryDiscoverySession } from "@/lib/globe/eatery/project-eatery-discovery-session";

export type GlobeEateryDiscoveryStartDetail = {
  eventId: string;
  resourceIds: readonly string[];
  intervalMs?: number;
};

export type GlobeEateryDiscoveryRevealDetail = {
  eventId: string;
  resourceId: string;
  index: number;
  total: number;
};

export type GlobeEateryDiscoverySummaryDetail = {
  eventId: string;
  summaryKo: string;
  topName: string;
  topReasonKo: string;
};

export function dispatchGlobeEateryDiscoverySession(
  session: GlobeEateryDiscoverySession,
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<GlobeEateryDiscoverySession>(GLOBE_EATERY_DISCOVERY_SESSION, {
      detail: session,
    }),
  );
}

export function dispatchGlobeEateryDiscoveryClose(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(GLOBE_EATERY_DISCOVERY_CLOSE));
}

export function subscribeGlobeEateryDiscoverySession(
  listener: (session: GlobeEateryDiscoverySession) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<GlobeEateryDiscoverySession>).detail;
    if (!detail?.eventId || !detail.items?.length) {
      return;
    }
    listener(detail);
  };
  window.addEventListener(GLOBE_EATERY_DISCOVERY_SESSION, handler);
  return () => window.removeEventListener(GLOBE_EATERY_DISCOVERY_SESSION, handler);
}

export function subscribeGlobeEateryDiscoveryClose(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(GLOBE_EATERY_DISCOVERY_CLOSE, listener);
  return () => window.removeEventListener(GLOBE_EATERY_DISCOVERY_CLOSE, listener);
}

export function dispatchGlobeEateryDiscoveryStart(
  detail: GlobeEateryDiscoveryStartDetail,
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<GlobeEateryDiscoveryStartDetail>(GLOBE_EATERY_DISCOVERY_START, {
      detail,
    }),
  );
}

export function dispatchGlobeEateryDiscoveryReveal(
  detail: GlobeEateryDiscoveryRevealDetail,
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<GlobeEateryDiscoveryRevealDetail>(GLOBE_EATERY_DISCOVERY_REVEAL, {
      detail,
    }),
  );
}

export function dispatchGlobeEateryDiscoverySummary(
  detail: GlobeEateryDiscoverySummaryDetail,
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<GlobeEateryDiscoverySummaryDetail>(GLOBE_EATERY_DISCOVERY_SUMMARY, {
      detail,
    }),
  );
}

export function subscribeGlobeEateryDiscoveryStart(
  listener: (detail: GlobeEateryDiscoveryStartDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<GlobeEateryDiscoveryStartDetail>).detail;
    if (!detail?.eventId || !detail.resourceIds?.length) {
      return;
    }
    listener(detail);
  };
  window.addEventListener(GLOBE_EATERY_DISCOVERY_START, handler);
  return () => window.removeEventListener(GLOBE_EATERY_DISCOVERY_START, handler);
}

export function subscribeGlobeEateryDiscoveryReveal(
  listener: (detail: GlobeEateryDiscoveryRevealDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<GlobeEateryDiscoveryRevealDetail>).detail);
  };
  window.addEventListener(GLOBE_EATERY_DISCOVERY_REVEAL, handler);
  return () => window.removeEventListener(GLOBE_EATERY_DISCOVERY_REVEAL, handler);
}

const REVEAL_INTERVAL_MS = 380;

export function runStagedEateryPinReveal(
  detail: GlobeEateryDiscoveryStartDetail,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const setRevealInterval = window.setInterval.bind(window);
  const clearRevealInterval = window.clearInterval.bind(window);
  const intervalMs = detail.intervalMs ?? REVEAL_INTERVAL_MS;
  const ids = [...detail.resourceIds];
  let index = 0;

  const tick = () => {
    const resourceId = ids[index];
    if (!resourceId) {
      return;
    }
    dispatchGlobeEateryDiscoveryReveal({
      eventId: detail.eventId,
      resourceId,
      index,
      total: ids.length,
    });
    index += 1;
    if (index >= ids.length) {
      clearRevealInterval(timer);
    }
  };

  tick();
  const timer = setRevealInterval(tick, intervalMs);
  return () => clearRevealInterval(timer);
}
