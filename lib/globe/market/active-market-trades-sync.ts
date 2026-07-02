"use client";

import { fetchActiveMarketTradesRemote } from "@/lib/globe/market/client/fetch-market-trades-client";
import { subscribeMarketIntents } from "@/lib/globe/market/market-alignment-store";
import type {
  MarketHandshakeIntentPair,
  MarketTradeSessionView,
} from "@/lib/globe/market/market-trade-types";
import { shouldSkipGlobeFetch } from "@/lib/globe/globe-fetch-min-interval";

export type ActiveMarketTradesSnapshot = {
  sessions: MarketTradeSessionView[];
  resolvedPairs: MarketHandshakeIntentPair[];
  loading: boolean;
  loadedOnce: boolean;
};

let snapshot: ActiveMarketTradesSnapshot = {
  sessions: [],
  resolvedPairs: [],
  loading: false,
  loadedOnce: false,
};

const listeners = new Set<() => void>();
let enabledHookCount = 0;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let marketUnsub: (() => void) | null = null;
let marketDebounce: ReturnType<typeof setTimeout> | null = null;
let refreshInFlight: Promise<void> | null = null;
let activeUserId: string | null = null;

const POLL_MS = 45_000;
const MARKET_EVENT_DEBOUNCE_MS = 3_000;
const MIN_FETCH_MS = 25_000;

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function replaceSessionInSnapshot(updated: MarketTradeSessionView): void {
  const prev = snapshot.sessions;
  const next =
    updated.tradeStatus === "completed" ||
    updated.tradeStatus === "cancelled" ||
    updated.phase === "completed"
      ? prev.filter((session) => session.handshakeId !== updated.handshakeId)
      : prev.map((session) =>
          session.handshakeId === updated.handshakeId ? updated : session,
        );
  snapshot = { ...snapshot, sessions: next };
  emit();
}

async function refreshActiveMarketTrades(): Promise<void> {
  if (!activeUserId || enabledHookCount <= 0) {
    return;
  }
  if (shouldSkipGlobeFetch("market:active-trades", MIN_FETCH_MS)) {
    return;
  }
  if (refreshInFlight) {
    return refreshInFlight;
  }

  const isInitialLoad = !snapshot.loadedOnce;
  if (isInitialLoad) {
    snapshot = { ...snapshot, loading: true };
    emit();
  }

  refreshInFlight = (async () => {
    try {
      const result = await fetchActiveMarketTradesRemote();
      snapshot = {
        sessions: result.sessions,
        resolvedPairs: result.resolvedPairs,
        loading: false,
        loadedOnce: true,
      };
    } catch {
      if (isInitialLoad) {
        snapshot = {
          sessions: [],
          resolvedPairs: [],
          loading: false,
          loadedOnce: false,
        };
      } else {
        snapshot = { ...snapshot, loading: false };
      }
    } finally {
      refreshInFlight = null;
      emit();
    }
  })();

  return refreshInFlight;
}

function onMarketIntentsChanged(): void {
  if (marketDebounce) {
    clearTimeout(marketDebounce);
  }
  marketDebounce = setTimeout(() => {
    marketDebounce = null;
    void refreshActiveMarketTrades();
  }, MARKET_EVENT_DEBOUNCE_MS);
}

function startPolling(): void {
  if (pollTimer) {
    return;
  }
  void refreshActiveMarketTrades();
  marketUnsub = subscribeMarketIntents(onMarketIntentsChanged);
  pollTimer = setInterval(() => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }
    void refreshActiveMarketTrades();
  }, POLL_MS);
}

function stopPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (marketUnsub) {
    marketUnsub();
    marketUnsub = null;
  }
  if (marketDebounce) {
    clearTimeout(marketDebounce);
    marketDebounce = null;
  }
  refreshInFlight = null;
}

export function subscribeActiveMarketTrades(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function getActiveMarketTradesSnapshot(): ActiveMarketTradesSnapshot {
  return snapshot;
}

/** One shared poll — call from each enabled hook; release on unmount. */
export function acquireActiveMarketTradesSync(userId: string): () => void {
  activeUserId = userId;
  enabledHookCount += 1;
  if (enabledHookCount === 1) {
    startPolling();
  } else {
    void refreshActiveMarketTrades();
  }
  return () => {
    enabledHookCount = Math.max(0, enabledHookCount - 1);
    if (enabledHookCount === 0) {
      stopPolling();
      activeUserId = null;
      snapshot = {
        sessions: [],
        resolvedPairs: [],
        loading: false,
        loadedOnce: false,
      };
      emit();
    }
  };
}

export function replaceActiveMarketTradeSession(
  updated: MarketTradeSessionView,
): void {
  replaceSessionInSnapshot(updated);
}

export function refreshActiveMarketTradesNow(): Promise<void> {
  return refreshActiveMarketTrades();
}

export function resetActiveMarketTradesSyncForTests(): void {
  stopPolling();
  listeners.clear();
  enabledHookCount = 0;
  activeUserId = null;
}
