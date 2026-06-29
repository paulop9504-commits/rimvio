"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FieldExternalMinePanel } from "@/components/field/field-external-mine-panel";
import { OpportunityDiscoveryFloor } from "@/components/field/opportunity-discovery-floor";
import {
  FIELD_DASHBOARD_CANVAS,
  FIELD_DASHBOARD_INSET,
} from "@/components/field/field-dashboard-layout";
import { OpportunityDashboardTabBar } from "@/components/field/opportunity-dashboard-tab-bar";
import type { FieldDashboardTab } from "@/lib/nav/field-dashboard-types";
import { MarketActiveTradesSection } from "@/components/field/market-active-trades-section";
import { useCopy } from "@/hooks/use-copy";
import type { OpportunityPill, OpportunityRow } from "@/lib/globe/opportunity-field";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import type { MarketTradeSessionView } from "@/lib/globe/market/market-trade-types";
import { runStagedFieldDiscoveryPinReveal } from "@/lib/globe/opportunity-field/globe-field-discovery-bridge";
import { cn } from "@/lib/utils";

export type OpportunityDashboardBodyProps = {
  loading: boolean;
  pills: readonly OpportunityPill[];
  matchedRows: readonly OpportunityRow[];
  browseRows: readonly OpportunityRow[];
  tradeSessions: readonly MarketTradeSessionView[];
  selectedPill: OpportunityPill | null;
  selectedContextId: string | null;
  onSelectContext: (id: string | null) => void;
  listeningLabel: string;
  onRowPress: (row: OpportunityRow) => void;
  onSessionUpdated?: (session: MarketTradeSessionView) => void;
  onFlyToMineIntent?: (record: MarketIntentRecord) => void;
  focusTradesToken?: number;
  initialTab?: FieldDashboardTab | null;
  highlightTradeId?: string | null;
  ingressGeneration?: number;
  mineCount?: number;
  headerRight?: ReactNode;
  headerClassName?: string;
  className?: string;
};

function tabHint(
  tab: FieldDashboardTab,
  field: ReturnType<typeof useCopy>["globe"]["field"],
): string {
  if (tab === "trades") {
    return field.dashboardTabTradesHint;
  }
  if (tab === "mine") {
    return field.dashboardTabMineHint;
  }
  return field.dashboardTabDiscoveryHint;
}

/** 밖 지구 통로 — 진행 중 거래 · 자원 찾기 · 내가 올린 맥락. */
export function OpportunityDashboardBody({
  loading,
  pills,
  matchedRows,
  browseRows,
  tradeSessions,
  selectedPill,
  selectedContextId,
  onSelectContext,
  listeningLabel,
  onRowPress,
  onSessionUpdated,
  onFlyToMineIntent,
  focusTradesToken = 0,
  initialTab = null,
  highlightTradeId = null,
  ingressGeneration = 0,
  mineCount = 0,
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

  const discoveryRows = useMemo(
    () => (selectedPill ? matchedRows : browseRows),
    [browseRows, matchedRows, selectedPill],
  );

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
    setTab(tradeSessions.length > 0 ? "trades" : "discovery");
  }, [ingressGeneration, initialTab]);

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

  const discoveryRevealKey = useMemo(
    () => discoveryRows.map((row) => row.listingId).join("|"),
    [discoveryRows],
  );

  useEffect(() => {
    if (tab !== "discovery" || discoveryRows.length === 0) {
      return;
    }
    return runStagedFieldDiscoveryPinReveal({
      rows: discoveryRows,
      contextId: selectedContextId,
    });
  }, [discoveryRevealKey, discoveryRows, selectedContextId, tab]);

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
              {tabHint(tab, field)}
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
          mineCount={mineCount}
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
                highlightScrollKey={ingressGeneration}
                embedded
              />
            </motion.div>
          ) : tab === "mine" ? (
            <motion.div
              key="mine-panel"
              role="tabpanel"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="absolute inset-0 flex min-h-0 flex-col"
            >
              <FieldExternalMinePanel
                enabled
                onFlyToIntent={onFlyToMineIntent}
                className="h-full"
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
                browseMode={!selectedPill}
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
