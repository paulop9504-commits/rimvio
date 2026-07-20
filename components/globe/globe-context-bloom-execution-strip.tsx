"use client";

/**
 * Context Bloom → Execution strip — appears only at execution_ready.
 * Prep CTAs only; never auto-Commit.
 */

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { copy } from "@/lib/copy/human-ko";
import { openFieldDashboardIngress } from "@/lib/nav/field-dashboard-ingress";
import { cn } from "@/lib/utils";
import {
  clearContextBloom,
  isContextBloomExecutionReady,
  readContextBloomSession,
  subscribeContextBloom,
  type ContextBloomSessionLive,
} from "@/lib/visual-projection";
import {
  gateBloomExecutionHandlers,
  openBloomDirectionsUrl,
  runContextBloomAddToInbox,
} from "@/lib/visual-projection/run-context-bloom-execution";

export type GlobeContextBloomExecutionStripProps = {
  fallbackContextEventId?: string | null;
  className?: string;
};

export function GlobeContextBloomExecutionStrip({
  fallbackContextEventId = null,
  className,
}: GlobeContextBloomExecutionStripProps) {
  const [session, setSession] = useState<ContextBloomSessionLive | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setSession(readContextBloomSession());
      setReady(isContextBloomExecutionReady());
    };
    sync();
    return subscribeContextBloom(sync);
  }, []);

  const selected = session?.selected ?? null;
  const visible = Boolean(ready && selected);

  const enqueueInbox = useCallback(() => {
    if (!selected) {
      return;
    }
    const result = runContextBloomAddToInbox({
      candidate: selected,
      fallbackContextEventId,
      reasonLinesKo: ["선택 후 준비"],
    });
    if (!result.ok) {
      if (result.reason === "no_context") {
        toast.error("맥락을 먼저 열어 주세요");
      }
      return;
    }
    toast.message(copy.globe.intelligentPinAddInboxToast(selected.label));
    openFieldDashboardIngress({
      tab: "queue",
      primaryEventId: result.eventId,
    });
  }, [fallbackContextEventId, selected]);

  const openDirections = useCallback(() => {
    if (!selected) {
      return;
    }
    window.open(openBloomDirectionsUrl(selected), "_blank", "noopener,noreferrer");
    toast.message(copy.globe.placeActionGraphDirectionsToast);
  }, [selected]);

  const gated = selected
    ? gateBloomExecutionHandlers({
        candidate: selected,
        handlers: {
          onDirections: openDirections,
          onReservePrep: enqueueInbox,
          onBookNow: enqueueInbox,
          onAddToExecutionInbox: enqueueInbox,
        },
      })
    : null;

  const hasAnyAction = Boolean(
    gated?.onDirections ||
      gated?.onReservePrep ||
      gated?.onBookNow ||
      gated?.onAddToExecutionInbox,
  );

  return (
    <AnimatePresence>
      {visible && selected && hasAnyAction && gated ? (
        <motion.aside
          key={`bloom-exec:${selected.id}`}
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.19, 1, 0.22, 1] }}
          className={cn(
            "pointer-events-auto w-[min(100%,17.5rem)] space-y-2.5 rounded-2xl bg-white/96 px-3.5 py-3 shadow-[0_12px_32px_rgba(15,23,42,0.14)] ring-1 ring-black/[0.05] backdrop-blur-md",
            className,
          )}
          data-globe-context-bloom-execution-strip
          data-bloom-phase="execution_ready"
          aria-live="polite"
        >
          <header className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8b95a1]">
                {copy.globe.contextBloomExecutionEyebrow}
              </p>
              <h3 className="truncate text-[15px] font-bold tracking-tight text-[#191f28]">
                {selected.label}
              </h3>
              <p className="text-[12px] leading-snug text-[#6b7684]">
                {copy.globe.contextBloomExecutionHint}
              </p>
            </div>
            <button
              type="button"
              onClick={() => clearContextBloom()}
              className="shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold text-[#8b95a1] active:opacity-70"
              aria-label={copy.globe.contextBloomExecutionDismissAria}
              data-bloom-exec-dismiss
            >
              ✕
            </button>
          </header>

          <div
            className="flex flex-wrap gap-1.5"
            data-bloom-exec-actions
          >
            {gated.onDirections ? (
              <button
                type="button"
                onClick={gated.onDirections}
                className="rounded-full bg-[#f5f5f7] px-2.5 py-1.5 text-[11px] font-semibold text-[#1d1d1f] ring-1 ring-black/[0.04]"
                data-bloom-exec-directions
              >
                {copy.globe.intelligentPinDirectionsCta}
              </button>
            ) : null}
            {gated.onReservePrep ? (
              <button
                type="button"
                onClick={gated.onReservePrep}
                className="rounded-full bg-[#f5f5f7] px-2.5 py-1.5 text-[11px] font-semibold text-[#1d1d1f] ring-1 ring-black/[0.04]"
                data-bloom-exec-reserve
              >
                {copy.globe.intelligentPinReservePrepCta}
              </button>
            ) : null}
            {gated.onBookNow ? (
              <button
                type="button"
                onClick={gated.onBookNow}
                className="rounded-full bg-[#0071e3] px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm"
                data-bloom-exec-book
              >
                {copy.globe.intelligentPinBookNowCta}
              </button>
            ) : null}
            {gated.onAddToExecutionInbox ? (
              <button
                type="button"
                onClick={gated.onAddToExecutionInbox}
                className="rounded-full bg-[#191f28] px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm"
                data-bloom-exec-inbox
              >
                {copy.globe.intelligentPinAddInboxCta}
              </button>
            ) : null}
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
