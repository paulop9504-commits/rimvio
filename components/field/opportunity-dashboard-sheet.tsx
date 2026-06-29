"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, X } from "lucide-react";
import { toast } from "sonner";
import { OpportunityDetailPanel } from "@/components/field/opportunity-detail-panel";
import { OpportunityDashboardBody } from "@/components/field/opportunity-dashboard-body";
import { useCopy } from "@/hooks/use-copy";
import { useActiveMarketTrades } from "@/hooks/use-active-market-trades";
import { useMarketManageIntents } from "@/hooks/use-market-manage-intents";
import { useOpportunityDashboard } from "@/hooks/use-opportunity-dashboard";
import { filterOpportunityRowsExcludingActiveTrades } from "@/lib/globe/opportunity-field/filter-rows-excluding-active-trades";
import { hasActiveMarketTradeForListing } from "@/lib/globe/market/market-trade-pipeline";
import {
  rimvioFieldDashboardSheetClass,
  rimvioSheetBackdropClass,
  rimvioSheetCloseBtnClass,
  rimvioSheetGrabberClass,
} from "@/lib/design/rimvio-ontology";
import type { OpportunityRow } from "@/lib/globe/opportunity-field";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import type { FieldDashboardTab } from "@/lib/nav/field-dashboard-types";
import { isIOS, isStandalonePwa } from "@/lib/platform/device";
import { dispatchFieldFlyToIntent } from "@/lib/nav/field-sheet-bridge";
import { cn } from "@/lib/utils";

export type OpportunityDashboardSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  primaryEventId?: string | null;
  dashboardTab?: FieldDashboardTab | null;
  highlightTradeId?: string | null;
  ingressGeneration?: number;
  onFlyToMineIntent?: (record: MarketIntentRecord) => void;
};

export function OpportunityDashboardSheet({
  open,
  onOpenChange,
  primaryEventId,
  dashboardTab = null,
  highlightTradeId = null,
  ingressGeneration = 0,
  onFlyToMineIntent,
}: OpportunityDashboardSheetProps) {
  const copy = useCopy();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [iosPwaSheet, setIosPwaSheet] = useState(false);
  const [detailRow, setDetailRow] = useState<OpportunityRow | null>(null);
  const [focusTradesToken, setFocusTradesToken] = useState(0);

  const {
    loading,
    pills,
    rows,
    browseRows,
    selectedContextId,
    setSelectedContextId,
    selectedPill,
    listeningLabel,
    refresh: refreshDiscovery,
  } = useOpportunityDashboard({ open, primaryEventId });

  const { listings, seekings } = useMarketManageIntents(open);
  const mineCount = listings.length + seekings.length;

  const {
    sessions: tradeSessions,
    resolvedPairs: resolvedTradePairs,
    refresh: refreshTrades,
    replaceSession,
  } = useActiveMarketTrades({ enabled: open });

  const matchedRows = useMemo(
    () =>
      filterOpportunityRowsExcludingActiveTrades(
        rows,
        tradeSessions,
        selectedPill?.seeking.id ?? null,
        resolvedTradePairs,
      ),
    [resolvedTradePairs, rows, selectedPill?.seeking.id, tradeSessions],
  );

  const filteredBrowseRows = useMemo(
    () =>
      filterOpportunityRowsExcludingActiveTrades(
        browseRows,
        tradeSessions,
        null,
        resolvedTradePairs,
      ),
    [browseRows, resolvedTradePairs, tradeSessions],
  );

  const tradeSeeking = selectedPill?.seeking ?? pills[0]?.seeking ?? null;
  const field = copy.globe.field;

  const handleRowPress = (row: OpportunityRow) => {
    if (!tradeSeeking) {
      toast.message(field.browseNeedSeekingBody);
      return;
    }
    setDetailRow(row);
  };

  useEffect(() => {
    setMounted(true);
    setIosPwaSheet(isIOS() && isStandalonePwa());
  }, []);

  useEffect(() => {
    if (!open) {
      setDetailRow(null);
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const sheetContent =
    detailRow && tradeSeeking ? (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-2 border-b border-[#f2f4f6] px-3 py-3">
          <button
            type="button"
            onClick={() => setDetailRow(null)}
            className="flex size-9 items-center justify-center rounded-full text-[#4e5968] active:bg-[#f2f4f6]"
            aria-label={field.backAria}
          >
            <ArrowLeft className="size-5" aria-hidden />
          </button>
          <p className="min-w-0 flex-1 truncate text-[17px] font-semibold text-[#191f28]">
            {detailRow.title}
          </p>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={rimvioSheetCloseBtnClass()}
            aria-label={field.closeAria}
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>
        <OpportunityDetailPanel
          row={detailRow}
          whyTitle={field.detailWhy}
          focusEventId={tradeSeeking.eventId}
          seeking={tradeSeeking}
          neighborBadge={field.neighborListingBadge}
          hasActiveTrade={hasActiveMarketTradeForListing(
            tradeSessions,
            detailRow.listing.id,
            tradeSeeking.id,
            resolvedTradePairs,
          )}
          className="min-h-0 flex-1"
          onBeforeNavigate={() => onOpenChange(false)}
          navigate={(href) => router.push(href)}
          onChatOpened={() => setDetailRow(null)}
          onScheduleStarted={() => {
            setDetailRow(null);
            void refreshTrades();
            setFocusTradesToken((value) => value + 1);
          }}
          onListingReserved={() => {
            setDetailRow(null);
            refreshDiscovery();
          }}
        />
      </div>
    ) : (
      <OpportunityDashboardBody
        loading={loading}
        pills={pills}
        matchedRows={matchedRows}
        browseRows={filteredBrowseRows}
        tradeSessions={tradeSessions}
        selectedPill={selectedPill}
        selectedContextId={selectedContextId}
        onSelectContext={setSelectedContextId}
        listeningLabel={listeningLabel}
        onRowPress={handleRowPress}
        onSessionUpdated={replaceSession}
        onFlyToMineIntent={(record) => {
          onFlyToMineIntent?.(record);
          dispatchFieldFlyToIntent(record);
          onOpenChange(false);
        }}
        focusTradesToken={focusTradesToken}
        initialTab={dashboardTab}
        highlightTradeId={highlightTradeId}
        ingressGeneration={ingressGeneration}
        mineCount={mineCount}
        headerClassName="pt-0"
        headerRight={
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={rimvioSheetCloseBtnClass()}
            aria-label={field.closeAria}
          >
            <X className="size-4" aria-hidden />
          </button>
        }
        className="min-h-0 flex-1"
      />
    );

  if (!mounted || !open) {
    return null;
  }

  const sheetPanelClass = cn(
    rimvioFieldDashboardSheetClass(),
    "rimvio-sheet-over-nav-panel touch-manipulation",
  );

  const sheetChrome = (
    <>
      <div className="shrink-0 pt-1" aria-hidden>
        <div className={rimvioSheetGrabberClass()} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{sheetContent}</div>
    </>
  );

  if (iosPwaSheet) {
    return createPortal(
      <>
        <div
          role="presentation"
          aria-hidden
          className={cn(rimvioSheetBackdropClass(), "rimvio-sheet-over-nav-backdrop")}
          onClick={() => onOpenChange(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={field.sheetTitle}
          className={sheetPanelClass}
          data-opportunity-dashboard-sheet
          data-opportunity-dashboard-sheet-ios-pwa
        >
          {sheetChrome}
        </div>
      </>,
      document.body,
    );
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            role="presentation"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(rimvioSheetBackdropClass(), "rimvio-sheet-over-nav-backdrop")}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={field.sheetTitle}
            initial={{ opacity: 0, y: "8%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "6%" }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className={sheetPanelClass}
            data-opportunity-dashboard-sheet
          >
            {sheetChrome}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
