"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { fetchMarketAlignInboxRemote } from "@/lib/globe/market/client/sync-market-intent-remote";
import type { MarketHandshakeOffer } from "@/lib/globe/market/market-handshake-types";
import { subscribeMarketIntents } from "@/lib/globe/market/market-alignment-store";

const POLL_MS = 45_000;

export function usePendingMarketAlignInbox(enabled = true): {
  offers: readonly MarketHandshakeOffer[];
  loading: boolean;
  refresh: () => void;
} {
  const { user } = useAuth();
  const [offers, setOffers] = useState<MarketHandshakeOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => subscribeMarketIntents(() => setRevision((n) => n + 1)), []);

  useEffect(() => {
    if (!enabled || !user?.id) {
      setOffers([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const rows = await fetchMarketAlignInboxRemote();
      if (!cancelled) {
        setOffers(rows);
        setLoading(false);
      }
    };

    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled, revision, user?.id]);

  return {
    offers,
    loading,
    refresh: () => setRevision((n) => n + 1),
  };
}
