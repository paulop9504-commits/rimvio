"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMarketTradeGuestPing } from "@/hooks/use-market-trade-guest-ping";
import {
  acquireActiveMarketTradesSync,
  getActiveMarketTradesSnapshot,
  refreshActiveMarketTradesNow,
  replaceActiveMarketTradeSession,
  subscribeActiveMarketTrades,
} from "@/lib/globe/market/active-market-trades-sync";
import type { MarketTradeSessionView } from "@/lib/globe/market/market-trade-types";

/** Shared singleton poll — safe to call from many components. */
export function useActiveMarketTrades(input: { enabled: boolean }) {
  const { user } = useAuth();

  useEffect(() => {
    if (!input.enabled || !user?.id) {
      return;
    }
    return acquireActiveMarketTradesSync(user.id);
  }, [input.enabled, user?.id]);

  const snap = useSyncExternalStore(
    subscribeActiveMarketTrades,
    getActiveMarketTradesSnapshot,
    getActiveMarketTradesSnapshot,
  );

  const replaceSession = useCallback((updated: MarketTradeSessionView) => {
    replaceActiveMarketTradeSession(updated);
  }, []);

  const refresh = useCallback(async () => {
    await refreshActiveMarketTradesNow();
  }, []);

  useMarketTradeGuestPing({
    enabled: input.enabled,
    sessions: snap.sessions,
    onSessionUpdated: replaceSession,
  });

  return {
    sessions: snap.sessions,
    resolvedPairs: snap.resolvedPairs,
    loading: snap.loading,
    refresh,
    replaceSession,
  };
}
