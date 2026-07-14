"use client";

import { useEffect, useMemo, useState } from "react";
import { useActiveMarketTrades } from "@/hooks/use-active-market-trades";
import {
  listActiveMarketIntents,
  subscribeMarketIntents,
} from "@/lib/globe/market/market-alignment-store";
import { filterPublishedMarketIntents } from "@/lib/globe/market/filter-published-market-intents";
import {
  resolveFieldNavBadgeCount,
  resolveFieldNavSuggestedTab,
} from "@/lib/nav/resolve-field-nav-badge";
import type { FieldDashboardTab } from "@/lib/nav/field-dashboard-types";
import {
  buildRealityControlSnapshot,
  subscribeRealityQueueHold,
} from "@/lib/reality-queue";
import {
  EVENT_CANDIDATES_UPDATED,
  listLifeEventCandidates,
} from "@/lib/life-read-model";

/**
 * Bottom-nav 맞춤 badge — Reality Queue pending count only (0 = hidden).
 * Not mine posts · not discovery browse signals.
 */
export function useFieldNavBadge() {
  const { sessions } = useActiveMarketTrades({ enabled: true });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    const unsubHold = subscribeRealityQueueHold(bump);
    const unsubMine = subscribeMarketIntents(bump);
    return () => {
      window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
      unsubHold();
      unsubMine();
    };
  }, []);

  const snapshot = useMemo(() => {
    void revision;
    return buildRealityControlSnapshot({
      tradeSessions: sessions,
      events: listLifeEventCandidates(),
    });
  }, [revision, sessions]);

  const queueCount = snapshot.impact.pendingCount;
  const tradeCount = sessions.length;
  const mineCount = useMemo(() => {
    void revision;
    return filterPublishedMarketIntents(listActiveMarketIntents()).length;
  }, [revision]);

  const total = resolveFieldNavBadgeCount(queueCount);
  const suggestedTab = useMemo<FieldDashboardTab>(
    () =>
      resolveFieldNavSuggestedTab({
        queueCount,
        tradeCount,
        mineCount,
      }),
    [mineCount, queueCount, tradeCount],
  );

  return {
    queueCount,
    tradeCount,
    mineCount,
    total,
    suggestedTab,
  };
}
