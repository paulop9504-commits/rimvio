"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMarketTradeGuestPing } from "@/hooks/use-market-trade-guest-ping";
import { fetchActiveMarketTradesRemote } from "@/lib/globe/market/client/fetch-market-trades-client";
import { subscribeMarketIntents } from "@/lib/globe/market/market-alignment-store";
import type {
  MarketHandshakeIntentPair,
  MarketTradeSessionView,
} from "@/lib/globe/market/market-trade-types";

const TRADE_POLL_MS = 30_000;

export function useActiveMarketTrades(input: { enabled: boolean }) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<MarketTradeSessionView[]>([]);
  const [resolvedPairs, setResolvedPairs] = useState<MarketHandshakeIntentPair[]>([]);
  const [loading, setLoading] = useState(false);

  const replaceSession = useCallback((updated: MarketTradeSessionView) => {
    setSessions((prev) => {
      if (updated.tradeStatus === "completed" || updated.phase === "completed") {
        return prev.filter((session) => session.handshakeId !== updated.handshakeId);
      }
      return prev.map((session) =>
        session.handshakeId === updated.handshakeId ? updated : session,
      );
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setSessions([]);
      setResolvedPairs([]);
      return;
    }
    setLoading(true);
    try {
      const result = await fetchActiveMarketTradesRemote();
      setSessions(result.sessions);
      setResolvedPairs(result.resolvedPairs);
    } catch {
      setSessions([]);
      setResolvedPairs([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!input.enabled) {
      return;
    }
    return subscribeMarketIntents(() => {
      void refresh();
    });
  }, [input.enabled, refresh]);

  useEffect(() => {
    if (!input.enabled) {
      return;
    }
    void refresh();
  }, [input.enabled, refresh]);

  useEffect(() => {
    if (!input.enabled || !user?.id) {
      return;
    }
    const id = window.setInterval(() => void refresh(), TRADE_POLL_MS);
    return () => window.clearInterval(id);
  }, [input.enabled, refresh, user?.id]);

  useMarketTradeGuestPing({
    enabled: input.enabled,
    sessions,
    onSessionUpdated: replaceSession,
  });

  return { sessions, resolvedPairs, loading, refresh, replaceSession };
}
