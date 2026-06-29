"use client";

import { useMemo } from "react";
import { useActiveMarketTrades } from "@/hooks/use-active-market-trades";
import { useOpportunityFieldBadge } from "@/hooks/use-opportunity-field-badge";
import type { FieldDashboardTab } from "@/lib/nav/field-dashboard-types";

/** Passive counts for bottom-nav 맞춤 tab — opens dashboard SSOT, not a second store. */
export function useFieldNavBadge() {
  const { sessions } = useActiveMarketTrades({ enabled: true });
  const discoveryCount = useOpportunityFieldBadge({
    enabled: true,
    primaryEventId: null,
  });

  const tradeCount = sessions.length;
  const total = tradeCount + discoveryCount;

  const suggestedTab = useMemo<FieldDashboardTab>(
    () => (tradeCount > 0 ? "trades" : "discovery"),
    [tradeCount],
  );

  return {
    tradeCount,
    discoveryCount,
    total,
    suggestedTab,
  };
}
