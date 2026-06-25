"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { OpportunityDetailPanel } from "@/components/field/opportunity-detail-panel";
import { OpportunityDashboardBody } from "@/components/field/opportunity-dashboard-body";
import { useCopy } from "@/hooks/use-copy";
import { useActiveMarketTrades } from "@/hooks/use-active-market-trades";
import { useOpportunityDashboard } from "@/hooks/use-opportunity-dashboard";
import { filterOpportunityRowsExcludingActiveTrades } from "@/lib/globe/opportunity-field/filter-rows-excluding-active-trades";
import type { OpportunityRow } from "@/lib/globe/opportunity-field";

/** Bottom-tab field surface — tabbed transaction + discovery. */
export function OpportunityFieldPageClient() {
  const copy = useCopy();
  const router = useRouter();
  const [detailRow, setDetailRow] = useState<OpportunityRow | null>(null);
  const [focusTradesToken, setFocusTradesToken] = useState(0);

  const {
    loading,
    pills,
    rows,
    selectedContextId,
    setSelectedContextId,
    listeningLabel,
    selectedPill,
  } = useOpportunityDashboard({ open: true, primaryEventId: null });

  const { sessions: tradeSessions, refresh: refreshTrades, replaceSession } =
    useActiveMarketTrades({
      enabled: true,
    });

  const discoveryRows = useMemo(
    () =>
      filterOpportunityRowsExcludingActiveTrades(
        rows,
        tradeSessions,
        selectedPill?.seeking.id ?? null,
      ),
    [rows, selectedPill?.seeking.id, tradeSessions],
  );

  const field = copy.globe.field;

  if (detailRow && selectedPill) {
    const hasActiveTrade = tradeSessions.some(
      (session) => session.listingIntentId === detailRow.listing.id,
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
          focusEventId={selectedPill.contextId}
          seekingIntentId={selectedPill.seeking.id}
          neighborBadge={field.neighborListingBadge}
          hasActiveTrade={hasActiveTrade}
          className="min-h-0 flex-1"
          navigate={(href) => router.push(href)}
          onBeforeNavigate={() => setDetailRow(null)}
          onChatOpened={() => setDetailRow(null)}
          onScheduleStarted={() => {
            setDetailRow(null);
            void refreshTrades();
            setFocusTradesToken((value) => value + 1);
          }}
        />
      </div>
    );
  }

  return (
    <OpportunityDashboardBody
      loading={loading}
      pills={pills}
      discoveryRows={discoveryRows}
      tradeSessions={tradeSessions}
      selectedContextId={selectedContextId}
      onSelectContext={setSelectedContextId}
      listeningLabel={listeningLabel}
      onRowPress={setDetailRow}
      onSessionUpdated={replaceSession}
      focusTradesToken={focusTradesToken}
      className="h-full flex-1"
    />
  );
}
