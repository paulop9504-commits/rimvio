"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Handshake, X } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import type { MarketAlignmentOffer } from "@/lib/globe/market/market-intent-types";
import type { MarketAlignmentGapAsk } from "@/lib/globe/market/resolve-market-alignment-gap-ask";
import { rimvioHeroCtaClass, RIMVIO_TYPE } from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

export type MarketAlignmentMainCardProps = {
  offer: MarketAlignmentOffer | null;
  loading?: boolean;
  gapAsk?: MarketAlignmentGapAsk | null;
  gapBusy?: boolean;
  onOpen: (offer: MarketAlignmentOffer) => void;
  onDismiss: () => void;
  onGapFill?: (input: {
    field: MarketAlignmentGapAsk["field"];
    value: string | number | boolean;
  }) => void;
  className?: string;
};

export function MarketAlignmentMainCard({
  offer,
  loading: _loading = false,
  gapAsk = null,
  gapBusy = false,
  onOpen,
  onDismiss,
  onGapFill,
  className,
}: MarketAlignmentMainCardProps) {
  return (
    <AnimatePresence>
      {offer ? (
        <motion.div
          key={`market-align-${offer.matchIntentId}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className={cn(
            "rounded-2xl bg-white/95 px-3.5 py-3 shadow-lg ring-1 ring-black/[0.06] backdrop-blur-md",
            className,
          )}
          data-market-align-card
          data-market-align-event={offer.matchEventId}
        >
          <div className="mb-2 flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className={cn(RIMVIO_TYPE.body, "font-semibold text-foreground")}>
                {offer.headline}
              </p>
              <p className={cn("mt-0.5", RIMVIO_TYPE.caption)}>{offer.body}</p>
              {offer.priorityHintKo ? (
                <p className={cn("mt-1", RIMVIO_TYPE.caption, "text-primary/90")}>
                  {offer.priorityHintKo}
                </p>
              ) : null}
              {gapAsk && onGapFill ? (
                <div className="mt-2">
                  <p className={cn(RIMVIO_TYPE.caption, "text-muted-foreground")}>
                    {gapAsk.promptKo}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {gapAsk.chips.map((chip) => (
                      <button
                        key={`${gapAsk.field}-${chip.label}`}
                        type="button"
                        disabled={gapBusy}
                        className="rounded-full bg-primary/10 px-2.5 py-1 text-[12px] font-medium text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
                        onClick={() =>
                          onGapFill({ field: gapAsk.field, value: chip.value })
                        }
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted/80"
              aria-label={copy.globe.ingestMenuCloseAria}
              onClick={onDismiss}
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <button
            type="button"
            className={cn(rimvioHeroCtaClass(), "w-full")}
            onClick={() => onOpen(offer)}
          >
            <Handshake className="size-5" aria-hidden />
            {offer.ctaLabel}
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
