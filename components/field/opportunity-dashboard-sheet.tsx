"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, X } from "lucide-react";
import { OpportunityDetailPanel } from "@/components/field/opportunity-detail-panel";
import { OpportunityDashboardBody } from "@/components/field/opportunity-dashboard-body";
import { useCopy } from "@/hooks/use-copy";
import { useActiveMarketTrades } from "@/hooks/use-active-market-trades";
import { useOpportunityDashboard } from "@/hooks/use-opportunity-dashboard";
import { filterOpportunityRowsExcludingActiveTrades } from "@/lib/globe/opportunity-field/filter-rows-excluding-active-trades";
import {
  RIMVIO_TYPE,
  rimvioBottomSheetClass,
  rimvioEmptyStateClass,
  rimvioHeroCtaClass,
  rimvioSheetBackdropClass,
  rimvioSheetCloseBtnClass,
} from "@/lib/design/rimvio-ontology";
import type { OpportunityRow } from "@/lib/globe/opportunity-field";
import type { GlobeLayerMode } from "@/lib/globe/globe-layer-mode";
import { isIOS, isStandalonePwa } from "@/lib/platform/device";
import { cn } from "@/lib/utils";

export type OpportunityDashboardSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layerMode: GlobeLayerMode;
  onSwitchToDiscovery?: () => void;
  primaryEventId?: string | null;
};

export function OpportunityDashboardSheet({
  open,
  onOpenChange,
  layerMode,
  onSwitchToDiscovery,
  primaryEventId,
}: OpportunityDashboardSheetProps) {
  const copy = useCopy();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [iosPwaSheet] = useState(() => isIOS() && isStandalonePwa());
  const [detailRow, setDetailRow] = useState<OpportunityRow | null>(null);
  const [focusTradesToken, setFocusTradesToken] = useState(0);

  const {
    loading,
    pills,
    rows,
    selectedContextId,
    setSelectedContextId,
    selectedPill,
    listeningLabel,
  } = useOpportunityDashboard({ open, primaryEventId });

  const {
    sessions: tradeSessions,
    refresh: refreshTrades,
    replaceSession,
  } = useActiveMarketTrades({ enabled: open });

  const discoveryRows = useMemo(
    () =>
      filterOpportunityRowsExcludingActiveTrades(
        rows,
        tradeSessions,
        selectedPill?.seeking.id ?? null,
      ),
    [rows, selectedPill?.seeking.id, tradeSessions],
  );

  useEffect(() => {
    setMounted(true);
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

  const field = copy.globe.field;
  const discoveryOnly = layerMode !== "discovery";

  const sheetContent =
    discoveryOnly ? (
      <DiscoveryGate
        onClose={() => onOpenChange(false)}
        onSwitch={() => onSwitchToDiscovery?.()}
      />
    ) : detailRow && selectedPill ? (
      <>
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
          focusEventId={selectedPill.contextId}
          seeking={selectedPill.seeking}
          neighborBadge={field.neighborListingBadge}
          hasActiveTrade={tradeSessions.some(
            (session) => session.listingIntentId === detailRow.listing.id,
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
        />
      </>
    ) : (
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
        headerClassName="pt-4"
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
    rimvioBottomSheetClass(),
    "z-[10071] flex max-h-[min(92dvh,52rem)] flex-col overflow-hidden bg-white",
  );

  if (iosPwaSheet) {
    return createPortal(
      <>
        <div
          role="presentation"
          aria-hidden
          className={cn(rimvioSheetBackdropClass(), "z-[10070]")}
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
          {sheetContent}
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
            className={cn(rimvioSheetBackdropClass(), "z-[10070]")}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={field.sheetTitle}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className={sheetPanelClass}
            data-opportunity-dashboard-sheet
          >
            {sheetContent}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function DiscoveryGate({
  onClose,
  onSwitch,
}: {
  onClose: () => void;
  onSwitch: () => void;
}) {
  const copy = useCopy();
  const field = copy.globe.field;

  return (
    <>
      <header className="flex shrink-0 items-center justify-between border-b border-[#f2f4f6] px-4 py-4">
        <p className="text-[20px] font-bold text-[#191f28]">{field.sheetTitle}</p>
        <button
          type="button"
          onClick={onClose}
          className={rimvioSheetCloseBtnClass()}
          aria-label={field.closeAria}
        >
          <X className="size-4" aria-hidden />
        </button>
      </header>
      <div className={cn(rimvioEmptyStateClass(), "flex flex-1 flex-col px-6 py-12 text-center")}>
        <p className={RIMVIO_TYPE.headline}>{field.discoveryGateTitle}</p>
        <p className={cn("mt-2", RIMVIO_TYPE.caption)}>{field.discoveryGateBody}</p>
        <button
          type="button"
          className={cn(rimvioHeroCtaClass(), "mt-8")}
          onClick={onSwitch}
        >
          {field.discoveryGateCta}
        </button>
      </div>
    </>
  );
}
