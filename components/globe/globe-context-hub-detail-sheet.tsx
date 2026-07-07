"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { GlobeContextHubRail } from "@/components/globe/globe-context-hub-rail";
import type { GlobeContextHubRailProps } from "@/components/globe/globe-context-hub-rail";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeContextHubDetailSheetProps = Omit<
  GlobeContextHubRailProps,
  "layout" | "presentation" | "defaultExpanded" | "onDismiss"
> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
};

/**
 * Full-screen Hub detail — map anchor opens this, not PinOpenSheet.
 * @see docs/GLOBE_HUB_RESOURCE.md · Context map flow
 */
export function GlobeContextHubDetailSheet({
  open,
  onOpenChange,
  className,
  activeEventId,
  ...railProps
}: GlobeContextHubDetailSheetProps) {
  const [mounted, setMounted] = useState(false);

  const headerTitle = useMemo(() => {
    const eventId = activeEventId?.trim();
    if (!eventId) {
      return copy.globe.contextHubDetailTitle;
    }
    const event = findLifeEventCandidate(eventId);
    return (
      event?.place?.trim() ||
      event?.title?.trim() ||
      copy.globe.contextHubDetailTitle
    );
  }, [activeEventId]);

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

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className={cn(
            "fixed inset-0 z-[70] flex flex-col bg-[#f5f5f7]",
            className,
          )}
          data-globe-context-hub-detail
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <header className="flex shrink-0 items-center gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[20px] font-semibold leading-tight text-[#1d1d1f]">
                {headerTitle}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/90 shadow-sm active:scale-95"
              aria-label={copy.globe.contextHubDetailCloseAria}
            >
              <X className="size-4 text-[#86868b]" aria-hidden />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1">
            <GlobeContextHubRail
              {...railProps}
              activeEventId={activeEventId}
              visible
              layout="hero"
              presentation="detail"
              defaultExpanded
              onDismiss={() => onOpenChange(false)}
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
