"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { useMarketManageIntents } from "@/hooks/use-market-manage-intents";
import { copy } from "@/lib/copy/human-ko";
import { RIMVIO_TYPE, rimvioGhostCtaClass } from "@/lib/design/rimvio-ontology";
import { marketCategoryLabelKo } from "@/lib/globe/market/market-category-registry";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import { isMarketIntentPublishedExternal } from "@/lib/globe/market/market-intent-detail";
import { publishMarketIntentExternal } from "@/lib/globe/market/publish-market-intent-external";
import { cn } from "@/lib/utils";

export type GlobeMarketManageSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFlyToIntent?: (record: MarketIntentRecord) => void;
};

function formatPriceLine(record: MarketIntentRecord): string {
  if (record.priceMinKrw === null && record.priceMaxKrw === null) {
    return copy.globe.marketIntentPriceOpen;
  }
  if (record.priceMinKrw !== null && record.priceMaxKrw !== null) {
    if (record.priceMinKrw === record.priceMaxKrw) {
      return `${Math.round(record.priceMinKrw / 10_000)}만원`;
    }
    return `${Math.round(record.priceMinKrw / 10_000)}~${Math.round(record.priceMaxKrw / 10_000)}만원`;
  }
  const value = record.priceMinKrw ?? record.priceMaxKrw ?? 0;
  return `${Math.round(value / 10_000)}만원`;
}

function MarketManageRow({
  record,
  onFlyTo,
  onEnd,
  onPublish,
}: {
  record: MarketIntentRecord;
  onFlyTo: () => void;
  onEnd: () => void;
  onPublish: () => void;
}) {
  const title =
    record.detail.productName.trim() || record.title.trim() || copy.globe.marketTradePlaceProductFallback;
  const published = isMarketIntentPublishedExternal(record.detail);

  return (
    <div
      className="rounded-2xl bg-muted/35 px-3 py-3 ring-1 ring-black/[0.04]"
      data-market-manage-row={record.eventId}
      data-market-manage-role={record.role}
      data-market-manage-published={published ? "true" : "false"}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-foreground">{title}</p>
          <p className={cn("mt-0.5", RIMVIO_TYPE.caption)}>
            {marketCategoryLabelKo(record.categoryId)} · {formatPriceLine(record)}
          </p>
          <p className="mt-1 flex items-center gap-1 text-[12px] text-muted-foreground">
            <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden />
            <span className="truncate">{record.placeLabel || copy.globe.marketIntentPrefillHint}</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold text-white",
              record.role === "listing" ? "bg-[#2b7fff]" : "bg-[#ef2b2b]",
            )}
          >
            {record.role === "listing"
              ? copy.globe.marketPinRoleListing
              : copy.globe.marketPinRoleSeeking}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {published
              ? copy.globe.marketManagePublishedBadge
              : copy.globe.marketManageInternalBadge}
          </span>
        </div>
      </div>
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          className={cn(rimvioGhostCtaClass(), "flex-1 text-[12px]")}
          onClick={onFlyTo}
        >
          {copy.globe.marketManageFlyTo}
        </button>
        {!published ? (
          <button
            type="button"
            className={cn(rimvioGhostCtaClass(), "flex-1 text-[12px] font-semibold text-primary")}
            onClick={onPublish}
          >
            {copy.globe.marketManagePublishCta}
          </button>
        ) : null}
        <button
          type="button"
          className={cn(rimvioGhostCtaClass(), "flex-1 text-[12px] text-muted-foreground")}
          onClick={onEnd}
        >
          {copy.globe.marketManageEndCta}
        </button>
      </div>
    </div>
  );
}

function MarketManageSection({
  title,
  pillClass,
  emptyLabel,
  rows,
  onFlyTo,
  onEnd,
  onPublish,
}: {
  title: string;
  pillClass: string;
  emptyLabel: string;
  rows: MarketIntentRecord[];
  onFlyTo: (record: MarketIntentRecord) => void;
  onEnd: (record: MarketIntentRecord) => void;
  onPublish: (record: MarketIntentRecord) => void;
}) {
  return (
    <section className="space-y-2" data-market-manage-section={title}>
      <div className="flex items-center gap-2 px-0.5">
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold text-white", pillClass)}>
          {title}
        </span>
        <span className={cn(RIMVIO_TYPE.caption)}>{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <p className={cn(RIMVIO_TYPE.caption, "rounded-2xl bg-muted/30 px-3 py-4 text-center")}>
          {emptyLabel}
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((record) => (
            <MarketManageRow
              key={record.eventId}
              record={record}
              onFlyTo={() => onFlyTo(record)}
              onEnd={() => onEnd(record)}
              onPublish={() => onPublish(record)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function GlobeMarketManageSheet({
  open,
  onOpenChange,
  onFlyToIntent,
}: GlobeMarketManageSheetProps) {
  const [mounted, setMounted] = useState(false);
  const { listings, seekings, loading, endIntent } = useMarketManageIntents(open);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleEnd = (record: MarketIntentRecord) => {
    void endIntent(record.eventId).then(() => {
      toast.message(copy.globe.marketManageEndedToast);
    });
  };

  const handlePublish = (record: MarketIntentRecord) => {
    void publishMarketIntentExternal(record.eventId).then((saved) => {
      if (saved) {
        toast.success(copy.globe.marketManagePublishedToast);
      }
    });
  };

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label={copy.globe.ingestMenuCloseAria}
            className="fixed inset-0 z-[62] bg-black/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={copy.globe.marketManageTitle}
            className="fixed inset-x-0 bottom-0 z-[63] mx-auto flex max-h-[min(78vh,640px)] w-full max-w-lg flex-col rounded-t-[1.35rem] bg-background shadow-2xl ring-1 ring-black/[0.06]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            data-globe-market-manage-sheet
          >
            <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3">
              <div>
                <p className={cn(RIMVIO_TYPE.headline, "text-lg")}>{copy.globe.marketManageTitle}</p>
                <p className={cn(RIMVIO_TYPE.caption)}>{copy.globe.marketManageSubtitle}</p>
              </div>
              <button
                type="button"
                className="rounded-xl p-2 text-muted-foreground hover:bg-muted/70"
                onClick={() => onOpenChange(false)}
                aria-label={copy.globe.ingestMenuCloseAria}
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
              {loading ? (
                <p className={cn(RIMVIO_TYPE.caption, "text-center py-6")}>
                  {copy.globe.marketTradePlaceResolving}
                </p>
              ) : (
                <>
                  <MarketManageSection
                    title={copy.globe.marketManageListingSection}
                    pillClass="bg-[#2b7fff]"
                    emptyLabel={copy.globe.marketManageEmptyListing}
                    rows={listings}
                    onFlyTo={(record) => {
                      onFlyToIntent?.(record);
                      onOpenChange(false);
                    }}
                    onEnd={handleEnd}
                    onPublish={handlePublish}
                  />
                  <MarketManageSection
                    title={copy.globe.marketManageSeekingSection}
                    pillClass="bg-[#ef2b2b]"
                    emptyLabel={copy.globe.marketManageEmptySeeking}
                    rows={seekings}
                    onFlyTo={(record) => {
                      onFlyToIntent?.(record);
                      onOpenChange(false);
                    }}
                    onEnd={handleEnd}
                    onPublish={handlePublish}
                  />
                </>
              )}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
