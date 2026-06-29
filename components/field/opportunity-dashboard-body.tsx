"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { OpportunityDiscoveryFloor } from "@/components/field/opportunity-discovery-floor";
import {
  FIELD_DASHBOARD_CANVAS,
  FIELD_DASHBOARD_INSET,
} from "@/components/field/field-dashboard-layout";
import {
  OpportunityDashboardTabBar,
} from "@/components/field/opportunity-dashboard-tab-bar";
import type { FieldDashboardTab } from "@/lib/nav/field-dashboard-types";
import { MarketActiveTradesSection } from "@/components/field/market-active-trades-section";
import { useCopy } from "@/hooks/use-copy";
import type { OpportunityPill, OpportunityRow } from "@/lib/globe/opportunity-field";
import type { MarketTradeSessionView } from "@/lib/globe/market/market-trade-types";
import { cn } from "@/lib/utils";

export type OpportunityDashboardBodyProps = {
  loading: boolean;
  pills: readonly OpportunityPill[];
  discoveryRows: readonly OpportunityRow[];
  tradeSessions: readonly MarketTradeSessionView[];
  selectedContextId: string | null;
  onSelectContext: (id: string) => void;
  listeningLabel: string;
  onRowPress: (row: OpportunityRow) => void;
  onSessionUpdated?: (session: MarketTradeSessionView) => void;
  /** Increment to focus the trades tab (e.g. after Pull start). */
  focusTradesToken?: number;
  /** Set when sheet opens via ingress (pill / deep link). */
  initialTab?: FieldDashboardTab | null;
  highlightTradeId?: string | null;
  ingressGeneration?: number;
  headerRight?: ReactNode;
  headerClassName?: string;
  className?: string;
};

/** Tabbed Field dashboard — transaction vs live discovery. */
export function OpportunityDashboardBody({
  loading,
  pills,
  discoveryRows,
  tradeSessions,
  selectedContextId,
  onSelectContext,
  listeningLabel,
  onRowPress,
  onSessionUpdated,
  focusTradesToken = 0,
  initialTab = null,
  highlightTradeId = null,
  ingressGeneration = 0,
  headerRight,
  headerClassName,
  className,
}: OpportunityDashboardBodyProps) {
  const copy = useCopy();
  const field = copy.globe.field;
  const [tab, setTab] = useState<FieldDashboardTab>(() =>
    tradeSessions.length > 0 ? "trades" : "discovery",
  );
  const prevTradeCountRef = useRef(tradeSessions.length);

  useEffect(() => {
    if (focusTradesToken > 0) {
      setTab("trades");
    }
  }, [focusTradesToken]);

  useEffect(() => {
    if (ingressGeneration <= 0) {
      return;
    }
    if (initialTab) {
      setTab(initialTab);
      return;
    }
    if (tradeSessions.length > 0) {
      setTab("trades");
      return;
    }
    setTab("discovery");
  }, [ingressGeneration, initialTab, tradeSessions.length]);

  useEffect(() => {
    const prev = prevTradeCountRef.current;
    prevTradeCountRef.current = tradeSessions.length;
    if (prev === 0 && tradeSessions.length > 0) {
      setTab("trades");
    }
    if (tradeSessions.length === 0 && tab === "trades") {
      setTab("discovery");
    }
  }, [tab, tradeSessions.length]);

  return (
    <div
      className={cn("flex min-h-0 flex-1 flex-col bg-white", className)}
      data-opportunity-dashboard-body
      data-field-dashboard-tab={tab}
    >
      <header
        className={cn(
          "shrink-0 border-b border-[#eef1f4] bg-white pb-0 pt-2",
          FIELD_DASHBOARD_INSET,
          headerClassName,
        )}
      >
        <div className="flex items-start justify-between gap-3 pb-2.5">
          <div className="min-w-0 flex-1">
            <h1 className="text-[20px] font-bold leading-tight tracking-tight text-[#191f28]">
              {field.sheetTitle}
            </h1>
            <p className="mt-0.5 text-[13px] leading-snug text-[#8b95a1]">
              {tab === "trades" ? field.dashboardTabTradesHint : field.dashboardTabDiscoveryHint}
            </p>
          </div>
          {headerRight ? (
            <div className="flex shrink-0 items-center pt-0.5">{headerRight}</div>
          ) : null}
        </div>

        <OpportunityDashboardTabBar
          value={tab}
          onChange={setTab}
          tradeCount={tradeSessions.length}
          className="px-0 pb-3 pt-0"
        />
      </header>

      <div className={cn("relative min-h-0 flex-1 overflow-hidden", FIELD_DASHBOARD_CANVAS)}>
        <AnimatePresence mode="wait" initial={false}>
          {tab === "trades" ? (
            <motion.div
              key="trades-panel"
              role="tabpanel"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="absolute inset-0 flex min-h-0 flex-col"
            >
              <MarketActiveTradesSection
                sessions={tradeSessions}
                onSessionUpdated={onSessionUpdated}
                highlightTradeId={highlightTradeId}
                embedded
              />
            </motion.div>
          ) : (
            <motion.div
              key="discovery-panel"
              role="tabpanel"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="absolute inset-0 flex min-h-0 flex-col"
            >
              <OpportunityDiscoveryFloor
                loading={loading}
                pills={pills}
                rows={discoveryRows}
                selectedContextId={selectedContextId}
                onSelectContext={onSelectContext}
                listeningLabel={listeningLabel}
                onRowPress={onRowPress}
                embedded
                className="h-full"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
