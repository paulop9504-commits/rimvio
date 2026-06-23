"use client";

import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, X } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import {
  rimvioBottomSheetClass,
  rimvioCompactPrimaryCtaClass,
  rimvioGhostCtaClass,
  rimvioSheetBackdropClass,
  rimvioSheetCloseBtnClass,
  RIMVIO_TYPE,
} from "@/lib/design/rimvio-ontology";
import type { MarketCompletionTraceDraft } from "@/lib/globe/market/market-handshake-types";
import { cn } from "@/lib/utils";

export type MarketCompletionTraceSheetProps = {
  trace: MarketCompletionTraceDraft | null;
  open: boolean;
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function MarketCompletionTraceSheet({
  trace,
  open,
  busy = false,
  onOpenChange,
  onConfirm,
}: MarketCompletionTraceSheetProps) {
  if (typeof document === "undefined" || !trace) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label={copy.globe.marketCompletionTraceSheetLater}
            className={rimvioSheetBackdropClass}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(rimvioBottomSheetClass, "px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3")}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <MapPin className="size-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className={cn(RIMVIO_TYPE.body, "font-semibold")}>
                    {copy.globe.marketCompletionTraceSheetTitle}
                  </p>
                  <p className={cn(RIMVIO_TYPE.caption, "mt-1 leading-snug text-muted-foreground")}>
                    {copy.globe.marketCompletionTraceSheetBody(trace.title, trace.placeLabel)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={rimvioSheetCloseBtnClass}
                aria-label={copy.globe.marketCompletionTraceSheetLater}
                onClick={() => onOpenChange(false)}
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className={cn(rimvioCompactPrimaryCtaClass(), "w-full")}
                disabled={busy}
                onClick={onConfirm}
              >
                {copy.globe.marketCompletionTraceSheetCta}
              </button>
              <button
                type="button"
                className={cn(rimvioGhostCtaClass, "w-full py-3 text-[15px]")}
                disabled={busy}
                onClick={() => onOpenChange(false)}
              >
                {copy.globe.marketCompletionTraceSheetLater}
              </button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
