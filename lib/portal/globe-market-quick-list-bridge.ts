export type GlobeMarketQuickListRequest = {
  requestId: string;
  composeText: string;
  eventId?: string | null;
};

export type GlobeMarketQuickListResult = {
  requestId: string;
  success: boolean;
};

export const GLOBE_MARKET_QUICK_LIST_REQUEST = "rimvio-globe-market-quick-list-request";
export const GLOBE_MARKET_QUICK_LIST_RESULT = "rimvio-globe-market-quick-list-result";

const QUICK_LIST_TIMEOUT_MS = 30_000;

export function dispatchGlobeMarketQuickListRequest(
  detail: GlobeMarketQuickListRequest,
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<GlobeMarketQuickListRequest>(GLOBE_MARKET_QUICK_LIST_REQUEST, {
      detail,
    }),
  );
}

export function dispatchGlobeMarketQuickListResult(
  detail: GlobeMarketQuickListResult,
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<GlobeMarketQuickListResult>(GLOBE_MARKET_QUICK_LIST_RESULT, {
      detail,
    }),
  );
}

export function subscribeGlobeMarketQuickListRequest(
  handler: (detail: GlobeMarketQuickListRequest) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const listener = (event: Event) => {
    const custom = event as CustomEvent<GlobeMarketQuickListRequest>;
    if (custom.detail?.requestId && custom.detail.composeText?.trim()) {
      handler(custom.detail);
    }
  };
  window.addEventListener(GLOBE_MARKET_QUICK_LIST_REQUEST, listener);
  return () => window.removeEventListener(GLOBE_MARKET_QUICK_LIST_REQUEST, listener);
}

export function subscribeGlobeMarketQuickListResult(
  handler: (detail: GlobeMarketQuickListResult) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const listener = (event: Event) => {
    const custom = event as CustomEvent<GlobeMarketQuickListResult>;
    if (custom.detail?.requestId) {
      handler(custom.detail);
    }
  };
  window.addEventListener(GLOBE_MARKET_QUICK_LIST_RESULT, listener);
  return () => window.removeEventListener(GLOBE_MARKET_QUICK_LIST_RESULT, listener);
}

/** CaptureSheet → Globe home quick-list handoff (one-liner @중고). */
export function requestGlobeMarketQuickList(input: {
  composeText: string;
  eventId?: string | null;
}): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }
  const requestId = `ql-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      unsubscribe();
      resolve(false);
    }, QUICK_LIST_TIMEOUT_MS);
    const unsubscribe = subscribeGlobeMarketQuickListResult((result) => {
      if (result.requestId !== requestId) {
        return;
      }
      window.clearTimeout(timeout);
      unsubscribe();
      resolve(result.success);
    });
    dispatchGlobeMarketQuickListRequest({
      requestId,
      composeText: input.composeText.trim(),
      eventId: input.eventId ?? null,
    });
  });
}
