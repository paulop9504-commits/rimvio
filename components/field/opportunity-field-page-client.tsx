"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Radio, Sparkles } from "lucide-react";
import { OpportunityDetailPanel } from "@/components/field/opportunity-detail-panel";
import { OpportunityOwnershipSectionLabel } from "@/components/field/opportunity-ownership-section-label";
import { OpportunityPillBar } from "@/components/field/opportunity-pill-bar";
import {
  OpportunityRowItem,
  OpportunityRowShimmer,
} from "@/components/field/opportunity-row-item";
import { useCopy } from "@/hooks/use-copy";
import { MarketActiveTradesSection } from "@/components/field/market-active-trades-section";
import { useActiveMarketTrades } from "@/hooks/use-active-market-trades";
import { useOpportunityDashboard } from "@/hooks/use-opportunity-dashboard";
import { RIMVIO_TYPE, rimvioEmptyStateClass } from "@/lib/design/rimvio-ontology";
import type { OpportunityRow } from "@/lib/globe/opportunity-field";
import { listMarketChatQuickReplies } from "@/lib/globe/market/market-chat-quick-replies";
import { cn } from "@/lib/utils";

/** Bottom-tab field surface — full page opportunity inbox. */
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
        <p className="mt-1 flex items-center gap-1.5 text-[13px] text-[#6b7684]">
          <Radio className="size-3.5 shrink-0 text-[#3182f6] animate-pulse" aria-hidden />
          {listeningLabel}
        </p>
      </header>

      <MarketActiveTradesSection
        sessions={tradeSessions}
        onSessionUpdated={replaceSession}
      />

      {pills.length > 0 ? (
        <OpportunityOwnershipSectionLabel
          title={field.mySeekingSection}
          hint={field.mySeekingHint}
          tone="mine"
        />
      ) : null}
      <OpportunityPillBar
        pills={pills}
        selectedContextId={selectedContextId}
        onSelect={setSelectedContextId}
        pillAria={field.pillAria}
        minePillLabel={field.ownershipMinePill}
      />

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8f9fb]/40 pb-[var(--rimvio-bottom-nav-offset)]">
        {loading ? (
          <OpportunityRowShimmer />
        ) : pills.length === 0 ? (
          <EmptyBlock title={field.emptySeekingTitle} body={field.emptySeekingBody} />
        ) : rows.length === 0 ? (
          <EmptyBlock title={field.emptyRowsTitle} body={field.emptyRowsBody} />
        ) : (
          <>
            <OpportunityOwnershipSectionLabel
              title={field.neighborListingsSection}
              hint={field.neighborListingsHint}
              tone="neighbor"
              className="bg-white"
            />
            <AnimatePresence mode="wait" initial={false}>
              <motion.ul
                key={selectedContextId ?? "none"}
                className="bg-white pt-0"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  {rows.map((row) => (
                    <OpportunityRowItem
                      key={row.listingId}
                      row={row}
                      scoreAria={field.rowScoreAria}
                      previewFallback={field.tradeCta}
                      onPress={() => setDetailRow(row)}
                    />
                  ))}
                </AnimatePresence>
              </motion.ul>
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}

function EmptyBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className={cn(rimvioEmptyStateClass(), "px-6 py-16 text-center")}>
      <p className={RIMVIO_TYPE.headline}>{title}</p>
      <p className={cn("mt-2", RIMVIO_TYPE.caption)}>{body}</p>
    </div>
  );
}
