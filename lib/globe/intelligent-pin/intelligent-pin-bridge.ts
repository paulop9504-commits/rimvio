import type {
  IntelligentDiscoveryActiveCardDetail,
  IntelligentDiscoveryFeedOpenDetail,
} from "@/lib/globe/intelligent-pin/types";

export const INTELLIGENT_DISCOVERY_FEED_OPEN =
  "rimvio:intelligent-discovery-feed-open";
export const INTELLIGENT_DISCOVERY_FEED_CLOSE =
  "rimvio:intelligent-discovery-feed-close";
export const INTELLIGENT_DISCOVERY_ACTIVE_CARD =
  "rimvio:intelligent-discovery-active-card";

export function dispatchIntelligentDiscoveryFeedOpen(
  detail: IntelligentDiscoveryFeedOpenDetail,
): void {
  if (typeof window === "undefined") {
    return;
  }
  const contextEventId = detail.contextEventId.trim();
  if (!contextEventId) {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<IntelligentDiscoveryFeedOpenDetail>(
      INTELLIGENT_DISCOVERY_FEED_OPEN,
      { detail: { ...detail, contextEventId } },
    ),
  );
}

export function dispatchIntelligentDiscoveryFeedClose(
  contextEventId: string,
): void {
  if (typeof window === "undefined") {
    return;
  }
  const id = contextEventId.trim();
  if (!id) {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<{ contextEventId: string }>(INTELLIGENT_DISCOVERY_FEED_CLOSE, {
      detail: { contextEventId: id },
    }),
  );
}

export function subscribeIntelligentDiscoveryFeedOpen(
  listener: (detail: IntelligentDiscoveryFeedOpenDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<IntelligentDiscoveryFeedOpenDetail>).detail);
  };
  window.addEventListener(INTELLIGENT_DISCOVERY_FEED_OPEN, handler);
  return () => window.removeEventListener(INTELLIGENT_DISCOVERY_FEED_OPEN, handler);
}

export function subscribeIntelligentDiscoveryFeedClose(
  listener: (detail: { contextEventId: string }) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<{ contextEventId: string }>).detail);
  };
  window.addEventListener(INTELLIGENT_DISCOVERY_FEED_CLOSE, handler);
  return () =>
    window.removeEventListener(INTELLIGENT_DISCOVERY_FEED_CLOSE, handler);
}

export function dispatchIntelligentDiscoveryActiveCard(
  detail: IntelligentDiscoveryActiveCardDetail,
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<IntelligentDiscoveryActiveCardDetail>(
      INTELLIGENT_DISCOVERY_ACTIVE_CARD,
      { detail },
    ),
  );
}

export function subscribeIntelligentDiscoveryActiveCard(
  listener: (detail: IntelligentDiscoveryActiveCardDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<IntelligentDiscoveryActiveCardDetail>).detail);
  };
  window.addEventListener(INTELLIGENT_DISCOVERY_ACTIVE_CARD, handler);
  return () =>
    window.removeEventListener(INTELLIGENT_DISCOVERY_ACTIVE_CARD, handler);
}
