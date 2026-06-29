/** Staged lodging pin reveal + chat summary after composer discovery. */

export const GLOBE_LODGING_DISCOVERY_START = "rimvio:globe-lodging-discovery-start";
export const GLOBE_LODGING_DISCOVERY_REVEAL = "rimvio:globe-lodging-discovery-reveal";
export const GLOBE_LODGING_DISCOVERY_SUMMARY = "rimvio:globe-lodging-discovery-summary";
export const GLOBE_LODGING_DISCOVERY_SESSION = "rimvio:globe-lodging-discovery-session";
export const GLOBE_LODGING_DISCOVERY_CLOSE = "rimvio:globe-lodging-discovery-close";

import type { GlobeLodgingDiscoverySession } from "@/lib/globe/lodging/project-lodging-discovery-session";
import { runStagedPinReveal } from "@/lib/globe/opportunity-field/staged-pin-reveal";

export type GlobeLodgingDiscoveryStartDetail = {
  eventId: string;
  resourceIds: readonly string[];
  intervalMs?: number;
};

export type GlobeLodgingDiscoveryRevealDetail = {
  eventId: string;
  resourceId: string;
  index: number;
  total: number;
};

export type GlobeLodgingDiscoverySummaryDetail = {
  eventId: string;
  summaryKo: string;
  topName: string;
  topReasonKo: string;
};

export function dispatchGlobeLodgingDiscoverySession(
  session: GlobeLodgingDiscoverySession,
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<GlobeLodgingDiscoverySession>(GLOBE_LODGING_DISCOVERY_SESSION, {
      detail: session,
    }),
  );
}

export function dispatchGlobeLodgingDiscoveryClose(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(GLOBE_LODGING_DISCOVERY_CLOSE));
}

export function subscribeGlobeLodgingDiscoverySession(
  listener: (session: GlobeLodgingDiscoverySession) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<GlobeLodgingDiscoverySession>).detail;
    if (!detail?.eventId || !detail.items?.length) {
      return;
    }
    listener(detail);
  };
  window.addEventListener(GLOBE_LODGING_DISCOVERY_SESSION, handler);
  return () => window.removeEventListener(GLOBE_LODGING_DISCOVERY_SESSION, handler);
}

export function subscribeGlobeLodgingDiscoveryClose(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(GLOBE_LODGING_DISCOVERY_CLOSE, listener);
  return () => window.removeEventListener(GLOBE_LODGING_DISCOVERY_CLOSE, listener);
}

export function dispatchGlobeLodgingDiscoveryStart(
  detail: GlobeLodgingDiscoveryStartDetail,
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<GlobeLodgingDiscoveryStartDetail>(GLOBE_LODGING_DISCOVERY_START, {
      detail,
    }),
  );
}

export function dispatchGlobeLodgingDiscoveryReveal(
  detail: GlobeLodgingDiscoveryRevealDetail,
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<GlobeLodgingDiscoveryRevealDetail>(GLOBE_LODGING_DISCOVERY_REVEAL, {
      detail,
    }),
  );
}

export function dispatchGlobeLodgingDiscoverySummary(
  detail: GlobeLodgingDiscoverySummaryDetail,
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<GlobeLodgingDiscoverySummaryDetail>(GLOBE_LODGING_DISCOVERY_SUMMARY, {
      detail,
    }),
  );
}

export function subscribeGlobeLodgingDiscoveryStart(
  listener: (detail: GlobeLodgingDiscoveryStartDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<GlobeLodgingDiscoveryStartDetail>).detail;
    if (!detail?.eventId || !detail.resourceIds?.length) {
      return;
    }
    listener(detail);
  };
  window.addEventListener(GLOBE_LODGING_DISCOVERY_START, handler);
  return () => window.removeEventListener(GLOBE_LODGING_DISCOVERY_START, handler);
}

export function subscribeGlobeLodgingDiscoveryReveal(
  listener: (detail: GlobeLodgingDiscoveryRevealDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<GlobeLodgingDiscoveryRevealDetail>).detail);
  };
  window.addEventListener(GLOBE_LODGING_DISCOVERY_REVEAL, handler);
  return () => window.removeEventListener(GLOBE_LODGING_DISCOVERY_REVEAL, handler);
}

export function subscribeGlobeLodgingDiscoverySummary(
  listener: (detail: GlobeLodgingDiscoverySummaryDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<GlobeLodgingDiscoverySummaryDetail>).detail);
  };
  window.addEventListener(GLOBE_LODGING_DISCOVERY_SUMMARY, handler);
  return () => window.removeEventListener(GLOBE_LODGING_DISCOVERY_SUMMARY, handler);
}

const REVEAL_INTERVAL_MS = 380;

export function runStagedLodgingPinReveal(
  detail: GlobeLodgingDiscoveryStartDetail,
): () => void {
  const intervalMs = detail.intervalMs ?? REVEAL_INTERVAL_MS;
  return runStagedPinReveal({
    items: detail.resourceIds.map((id) => ({ id })),
    intervalMs,
    onReveal: (tick) => {
      dispatchGlobeLodgingDiscoveryReveal({
        eventId: detail.eventId,
        resourceId: tick.id,
        index: tick.index,
        total: tick.total,
      });
    },
  });
}
