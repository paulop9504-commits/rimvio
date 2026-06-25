"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { OpportunityDetailPanel } from "@/components/field/opportunity-detail-panel";
import { OpportunityDiscoveryFloor } from "@/components/field/opportunity-discovery-floor";
import { MarketActiveTradesSection } from "@/components/field/market-active-trades-section";
import { useCopy } from "@/hooks/use-copy";
import { useActiveMarketTrades } from "@/hooks/use-active-market-trades";
import { useOpportunityDashboard } from "@/hooks/use-opportunity-dashboard";
import { filterOpportunityRowsExcludingActiveTrades } from "@/lib/globe/opportunity-field/filter-rows-excluding-active-trades";
import type { OpportunityRow } from "@/lib/globe/opportunity-field";
import { listMarketChatQuickReplies } from "@/lib/globe/market/market-chat-quick-replies";

/** Bottom-tab field surface — transaction floor + discovery floor. */
export function OpportunityFieldPageClient() {
  const copy = useCopy();
  const router = useRouter();
  const [detailRow, setDetailRow] = useState<OpportunityRow | null>(null);

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
  const quickReplies = listMarketChatQuickReplies(field);

  if (detailRow && selectedPill) {
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
          quickReplies={quickReplies}
          chatPlaceholder={field.chatPlaceholder}
          bridgeFail={copy.globe.marketAlignBridgeFail}
          neighborBadge={field.neighborListingBadge}
          stayOnDashboard
          tradeStartedToast={copy.globe.marketTradeStartedToast}
          navigate={(href) => router.push(href)}
          onTradeStarted={() => void refreshTrades()}
        />
      </div>
    );
  }

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col bg-white"
      data-opportunity-field-page="list"
    >
      <header className="shrink-0 border-b border-[#f2f4f6] bg-white px-4 pb-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <p className="flex items-center gap-1.5 text-[20px] font-bold tracking-tight text-[#191f28]">
          <Sparkles className="size-5 shrink-0 text-[#3182f6]" aria-hidden />
          {field.sheetTitle}
        </p>
      </header>

      <MarketActiveTradesSection
        sessions={tradeSessions}
        onSessionUpdated={replaceSession}
      />

      <OpportunityDiscoveryFloor
        loading={loading}
        pills={pills}
        rows={discoveryRows}
        selectedContextId={selectedContextId}
        onSelectContext={setSelectedContextId}
        listeningLabel={listeningLabel}
        onRowPress={setDetailRow}
        className="flex-1"
      />
    </div>
  );
}
