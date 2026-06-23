"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  deactivateMarketIntentRemote,
  fetchOwnMarketIntentsRemote,
} from "@/lib/globe/market/client/sync-market-intent-remote";
import {
  deactivateMarketIntent,
  listActiveMarketIntents,
  subscribeMarketIntents,
} from "@/lib/globe/market/market-alignment-store";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";

function mergeMarketIntents(
  local: readonly MarketIntentRecord[],
  remote: readonly MarketIntentRecord[],
): MarketIntentRecord[] {
  const merged = new Map<string, MarketIntentRecord>();
  for (const row of local) {
    if (row.active) {
      merged.set(row.eventId, row);
    }
  }
  for (const row of remote) {
    if (row.active) {
      merged.set(row.eventId, row);
    }
  }
  return [...merged.values()].sort(
    (left, right) =>
      Date.parse(right.confirmedAtIso) - Date.parse(left.confirmedAtIso),
  );
}

export function useMarketManageIntents(open: boolean): {
  listings: MarketIntentRecord[];
  seekings: MarketIntentRecord[];
  loading: boolean;
  refresh: () => void;
  endIntent: (eventId: string) => Promise<void>;
} {
  const { user } = useAuth();
  const [revision, setRevision] = useState(0);
  const [remoteRows, setRemoteRows] = useState<MarketIntentRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    setRevision((value) => value + 1);
  }, []);

  useEffect(() => subscribeMarketIntents(refresh), [refresh]);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    if (!user?.id) {
      setRemoteRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    void (async () => {
      const rows = await fetchOwnMarketIntentsRemote();
      if (!cancelled) {
        setRemoteRows(rows);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, revision, user?.id]);

  const active = useMemo(() => {
    void revision;
    return mergeMarketIntents(listActiveMarketIntents(), remoteRows);
  }, [remoteRows, revision]);

  const listings = useMemo(
    () => active.filter((row) => row.role === "listing"),
    [active],
  );
  const seekings = useMemo(
    () => active.filter((row) => row.role === "seeking"),
    [active],
  );

  const endIntent = useCallback(
    async (eventId: string) => {
      const key = eventId.trim();
      if (!key) {
        return;
      }
      deactivateMarketIntent(key);
      if (user?.id) {
        await deactivateMarketIntentRemote(key);
      }
      refresh();
    },
    [refresh, user?.id],
  );

  return { listings, seekings, loading, refresh, endIntent };
}
