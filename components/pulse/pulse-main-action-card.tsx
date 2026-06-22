"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CalendarPlus, Navigation, X } from "lucide-react";
import type { PulseMainActionOffer } from "@/lib/globe/trend-bridge/resolve-pulse-main-action";
import { rimvioHeroCtaClass, RIMVIO_TYPE } from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

export type PulseMainActionCardProps = {
  offer: PulseMainActionOffer | null;
  loading?: boolean;
  onPrimary: (offer: PulseMainActionOffer) => void;
  onSecondary?: (offer: PulseMainActionOffer) => void;
  onDismiss: () => void;
  className?: string;
};

/** Memories × Pulse → one MAIN card (navigate or schedule), session dismiss. */
export function PulseMainActionCard({
  offer,
  loading = false,
  onPrimary,
  onSecondary,
  onDismiss,
  className,
}: PulseMainActionCardProps) {
  const PrimaryIcon = offer?.primaryKind === "schedule" ? CalendarPlus : Navigation;

  return (
    <AnimatePresence>
      {loading ? (
        <motion.div
          key="pulse-main-loading"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className={cn(
            "rounded-2xl bg-white/92 px-3.5 py-3 shadow-lg ring-1 ring-black/[0.06] backdrop-blur-md",
            className,
          )}
          data-pulse-main-card="loading"
          aria-busy
        >
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-3 w-full animate-pulse rounded bg-muted/80" />
        </motion.div>
      ) : offer ? (
        <motion.div
          key={`pulse-main-${offer.eventId}-${offer.mode}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className={cn(
            "rounded-2xl bg-white/95 px-3.5 py-3 shadow-lg ring-1 ring-black/[0.06] backdrop-blur-md",
            className,
          )}
          data-pulse-main-card
          data-pulse-main-event={offer.eventId}
          data-pulse-main-mode={offer.mode}
        >
          <div className="mb-2 flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className={cn(RIMVIO_TYPE.body, "font-semibold text-foreground")}>
                {offer.headline}
              </p>
              <p className={cn("mt-0.5", RIMVIO_TYPE.caption)}>{offer.body}</p>
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
            onClick={() => onPrimary(offer)}
            data-pulse-main-cta
            data-pulse-main-cta-kind={offer.primaryKind}
          >
            <PrimaryIcon className="size-5" aria-hidden />
            {offer.primaryLabel}
          </button>
          {offer.secondaryKind && offer.secondaryLabel && onSecondary ? (
            <button
              type="button"
              className={cn(
                "mt-2 w-full rounded-xl py-2 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
              )}
              onClick={() => onSecondary(offer)}
              data-pulse-main-secondary
              data-pulse-main-secondary-kind={offer.secondaryKind}
            >
              {offer.secondaryLabel}
            </button>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
