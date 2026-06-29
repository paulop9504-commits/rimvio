"use client";

import { useEffect, useMemo, useState } from "react";
import { useActiveMarketTrades } from "@/hooks/use-active-market-trades";
import { useOpportunityFieldBadge } from "@/hooks/use-opportunity-field-badge";
import {
  listActiveMarketIntents,
  subscribeMarketIntents,
} from "@/lib/globe/market/market-alignment-store";
import { filterPublishedMarketIntents } from "@/lib/globe/market/filter-published-market-intents";
import type { FieldDashboardTab } from "@/lib/nav/field-dashboard-types";

/** Passive counts for bottom-nav 맞춤 tab — opens dashboard SSOT, not a second store. */
export function useFieldNavBadge() {
  const { sessions } = useActiveMarketTrades({ enabled: true });
  const { matchedCount, browseCount } = useOpportunityFieldBadge({
    enabled: true,
    primaryEventId: null,
  });
  const [mineRevision, setMineRevision] = useState(0);

  useEffect(() => subscribeMarketIntents(() => setMineRevision((value) => value + 1)), []);

  const mineCount = useMemo(() => {
    void mineRevision;
    return filterPublishedMarketIntents(listActiveMarketIntents()).length;
  }, [mineRevision]);

  const tradeCount = sessions.length;
  const discoverySignal = matchedCount > 0 ? matchedCount : browseCount;
  const total = tradeCount + discoverySignal + mineCount;

  const suggestedTab = useMemo<FieldDashboardTab>(() => {
    if (tradeCount > 0) {
      return "trades";
    }
    if (discoverySignal > 0) {
      return "discovery";
    }
    if (mineCount > 0) {
      return "mine";
    }
    return "discovery";
  }, [discoverySignal, mineCount, tradeCount]);

  return {
    tradeCount,
    matchedCount,
    browseCount,
    mineCount,
    discoverySignal,
    total,
    suggestedTab,
  };
}
