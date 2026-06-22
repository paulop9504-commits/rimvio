"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Handshake, X } from "lucide-react";
import type { MarketAlignmentOffer } from "@/lib/globe/market/market-intent-types";
import { rimvioHeroCtaClass, RIMVIO_TYPE } from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

export type MarketAlignmentMainCardProps = {
  offer: MarketAlignmentOffer | null;
  loading?: boolean;
  onOpen: (offer: MarketAlignmentOffer) => void;
  onDismiss: () => void;
  className?: string;
};

export function MarketAlignmentMainCard({
  offer,
  loading = false,
  onOpen,
  onDismiss,
  className,
}: MarketAlignmentMainCardProps) {
  return (
    <AnimatePresence>
      {loading ? (
        <motion.div
          key="market-align-loading"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className={cn(
            "rounded-2xl bg-white/92 px-3.5 py-3 shadow-lg ring-1 ring-black/[0.06] backdrop-blur-md",
            className,
          )}
          aria-busy
        >
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-3 w-full animate-pulse rounded bg-muted/80" />
        </motion.div>
      ) : offer ? (
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
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted/80"
              aria-label="닫기"
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
            {offer.matchUserId
              ? offer.ctaLabel
              : offer.ctaLabel}
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
