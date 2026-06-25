"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Radio, Sparkles, X } from "lucide-react";
import { OpportunityDetailPanel } from "@/components/field/opportunity-detail-panel";
import { OpportunityOwnershipSectionLabel } from "@/components/field/opportunity-ownership-section-label";
import { OpportunityPillBar } from "@/components/field/opportunity-pill-bar";
import {
  OpportunityCardShimmer,
  OpportunityCardSlot,
} from "@/components/field/opportunity-card-slot";
import { useCopy } from "@/hooks/use-copy";
import { useOpportunityDashboard } from "@/hooks/use-opportunity-dashboard";
import {
  RIMVIO_TYPE,
  rimvioBottomSheetClass,
  rimvioEmptyStateClass,
  rimvioHeroCtaClass,
  rimvioSheetBackdropClass,
  rimvioSheetCloseBtnClass,
} from "@/lib/design/rimvio-ontology";
import type { OpportunityRow } from "@/lib/globe/opportunity-field";
import { listMarketChatQuickReplies } from "@/lib/globe/market/market-chat-quick-replies";
import type { GlobeLayerMode } from "@/lib/globe/globe-layer-mode";
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
  const [detailRow, setDetailRow] = useState<OpportunityRow | null>(null);

  const {
    loading,
    pills,
    rows,
    selectedContextId,
    setSelectedContextId,
    selectedPill,
    listeningLabel,
  } = useOpportunityDashboard({ open, primaryEventId });

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
  const quickReplies = listMarketChatQuickReplies(field);
  const discoveryOnly = layerMode !== "discovery";

  if (!mounted) {
    return null;
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
            className={cn(
              rimvioBottomSheetClass(),
              "z-[10071] flex max-h-[min(92dvh,52rem)] flex-col overflow-hidden bg-white",
            )}
            data-opportunity-dashboard-sheet
          >
            {discoveryOnly ? (
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
                  quickReplies={quickReplies}
                  chatPlaceholder={field.chatPlaceholder}
                  bridgeFail={copy.globe.marketAlignBridgeFail}
                  neighborBadge={field.neighborListingBadge}
                  onBeforeNavigate={() => onOpenChange(false)}
                  navigate={(href) => router.push(href)}
                />
              </>
            ) : (
              <>
                <header className="shrink-0 border-b border-[#f2f4f6] bg-white px-4 pb-3 pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-[20px] font-bold tracking-tight text-[#191f28]">
                        <Sparkles className="size-5 shrink-0 text-[#3182f6]" aria-hidden />
                        {field.sheetTitle}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-[13px] text-[#6b7684]">
                        <Radio className="size-3.5 shrink-0 text-[#3182f6] animate-pulse" aria-hidden />
                        {listeningLabel}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenChange(false)}
                      className={rimvioSheetCloseBtnClass()}
                      aria-label={field.closeAria}
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </div>
                </header>

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

                <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8f9fb]/40">
                  {loading ? (
                    <OpportunityCardShimmer />
                  ) : pills.length === 0 ? (
                    <EmptyBlock
                      title={field.emptySeekingTitle}
                      body={field.emptySeekingBody}
                    />
                  ) : rows.length === 0 ? (
                    <EmptyBlock
                      title={field.emptyRowsTitle}
                      body={field.emptyRowsBody}
                    />
                  ) : (
                    <>
                      <OpportunityOwnershipSectionLabel
                        title={field.neighborListingsSection}
                        hint={field.neighborListingsHint}
                        tone="neighbor"
                        className="bg-white"
                      />
                      <div className="bg-transparent pt-1">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={selectedContextId ?? "none"}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                      >
                        <AnimatePresence mode="popLayout" initial={false}>
                          {rows.map((row) => (
                            <OpportunityCardSlot
                              key={row.listingId}
                              row={row}
                              scoreAria={field.rowScoreAria}
                              neighborBadge={field.neighborListingBadge}
                              storyTitle={field.cardStoryTitle}
                              storyEmpty={field.cardStoryEmpty}
                              swipeHint={field.cardFilmSwipeHint}
                              chatCta={field.tradeCta}
                              onChat={() => setDetailRow(row)}
                            />
                          ))}
                        </AnimatePresence>
                      </motion.div>
                    </AnimatePresence>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
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
