"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { OpportunityDetailPanel } from "@/components/field/opportunity-detail-panel";
import { OpportunityDashboardBody } from "@/components/field/opportunity-dashboard-body";
import { useCopy } from "@/hooks/use-copy";
import { useActiveMarketTrades } from "@/hooks/use-active-market-trades";
import { useMarketManageIntents } from "@/hooks/use-market-manage-intents";
import { useOpportunityDashboard } from "@/hooks/use-opportunity-dashboard";
import { findMarketTradeSessionForPair, hasActiveMarketTradeForListing } from "@/lib/globe/market/market-trade-pipeline";
import { filterOpportunityRowsExcludingActiveTrades } from "@/lib/globe/opportunity-field/filter-rows-excluding-active-trades";
import type { OpportunityRow } from "@/lib/globe/opportunity-field";

/** Bottom-tab field surface — 밖 지구 통로 (거래 · 자원 찾기 · 내 게시물). */
export function OpportunityFieldPageClient() {
  const copy = useCopy();
  const router = useRouter();
  const [detailRow, setDetailRow] = useState<OpportunityRow | null>(null);
  const [focusTradesToken, setFocusTradesToken] = useState(0);

  const {
    loading,
    pills,
    rows,
    browseRows,
    selectedContextId,
    setSelectedContextId,
    listeningLabel,
    selectedPill,
    refresh: refreshDiscovery,
  } = useOpportunityDashboard({ open: true, primaryEventId: null });

  const { listings, seekings } = useMarketManageIntents(true);
  const mineCount = listings.length + seekings.length;

  const { sessions: tradeSessions, resolvedPairs: resolvedTradePairs, refresh: refreshTrades, replaceSession } =
    useActiveMarketTrades({
      enabled: true,
    });

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

  if (detailRow && tradeSeeking) {
    const hasActiveTrade = hasActiveMarketTradeForListing(
      tradeSessions,
      detailRow.listing.id,
      tradeSeeking.id,
      resolvedTradePairs,
    );
    const activeTradeSession = findMarketTradeSessionForPair(
      tradeSessions,
      detailRow.listing.id,
      tradeSeeking.id,
    );

    return (
      <div
        className="flex h-full min-h-0 flex-1 flex-col bg-white"
        data-opportunity-field-page="detail"
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-[#f2f4f6] px-3 pb-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
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
        </header>
        <OpportunityDetailPanel
          row={detailRow}
          whyTitle={field.detailWhy}
          focusEventId={tradeSeeking.eventId}
          seeking={tradeSeeking}
          neighborBadge={field.neighborListingBadge}
          hasActiveTrade={hasActiveTrade}
          activeTradeSession={activeTradeSession}
          className="min-h-0 flex-1"
          navigate={(href) => router.push(href)}
          onBeforeNavigate={() => setDetailRow(null)}
          onChatOpened={() => setDetailRow(null)}
          onScheduleStarted={() => {
            setDetailRow(null);
            void refreshTrades();
            setFocusTradesToken((value) => value + 1);
          }}
          onCoordinationStarted={() => {
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
    );
  }

  return (
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
      focusTradesToken={focusTradesToken}
      mineCount={mineCount}
      className="h-full flex-1"
    />
  );
}
