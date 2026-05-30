"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Navigation, X } from "lucide-react";
import { GlangoActionButton } from "@/components/ui/glango-action-button";
import { useCopy } from "@/hooks/use-copy";
import {
  buildNavSectorOptions,
  hideNavSectorProvider,
  NAV_SECTOR_UPDATED,
  navSectorUsageCount,
  type NavSectorDestination,
  type NavSectorOption,
  type NavSectorProvider,
} from "@/lib/navigation/nav-sector";
import { cn } from "@/lib/utils";

type NavSectorSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destination: NavSectorDestination | null;
  placeLabel?: string | null;
  onSelect: (option: NavSectorOption) => void;
};

export function NavSectorSheet({
  open,
  onOpenChange,
  destination,
  placeLabel,
  onSelect,
}: NavSectorSheetProps) {
  const copy = useCopy();
  const [mounted, setMounted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onUpdate = () => setRefreshKey((value) => value + 1);
    window.addEventListener(NAV_SECTOR_UPDATED, onUpdate);
    return () => window.removeEventListener(NAV_SECTOR_UPDATED, onUpdate);
  }, [open]);

  const options = useMemo(() => {
    if (!destination) {
      return [];
    }

    void refreshKey;
    return buildNavSectorOptions(destination);
  }, [destination, refreshKey]);

  if (!mounted || !destination) {
    return null;
  }

  const place = placeLabel?.trim() || destination.placeName?.trim() || destination.query;
  const topUsage = Math.max(...options.map((option) => navSectorUsageCount(option.id)), 0);

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="닫기"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-[2px]"
            onClick={() => onOpenChange(false)}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="nav-sector-sheet-title"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "fixed inset-x-0 bottom-0 z-[81] mx-auto max-w-lg",
              "rounded-t-[28px] bg-[#FAFAFC] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3",
              "shadow-[0_-18px_48px_-24px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.06]"
            )}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/10" />

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2
                  id="nav-sector-sheet-title"
                  className="text-[15px] font-semibold tracking-tight"
                >
                  {copy.settings.navSectorTitle}
                </h2>
                <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
                  {copy.settings.navSectorHint(place.slice(0, 28))}
                </p>
              </div>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => onOpenChange(false)}
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f2f2f7] text-muted-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 max-h-[52vh] space-y-2 overflow-y-auto">
              {options.map((option, index) => {
                const usage = navSectorUsageCount(option.id);
                const isTopPick = usage > 0 && usage === topUsage;

                return (
                  <div key={option.id} className="flex items-stretch gap-2">
                    <GlangoActionButton
                      type="button"
                      variant={isTopPick ? "primary" : "secondary"}
                      layout="tile"
                      fullWidth
                      className={cn(
                        "min-w-0 flex-1",
                        isTopPick && index === 0 && usage > 0 && "ring-2 ring-[#4A90E2]/30"
                      )}
                      onClick={() => {
                        onSelect(option);
                        onOpenChange(false);
                      }}
                      iconSlot={
                        index === 0 && usage > 0 ? (
                          <Navigation className="size-5" strokeWidth={2.5} />
                        ) : (
                          <span className="text-lg leading-none">{option.emoji}</span>
                        )
                      }
                      hint={option.hint}
                      trailing={
                        isTopPick ? (
                          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">
                            {copy.settings.navSectorFrequentBadge}
                          </span>
                        ) : undefined
                      }
                    >
                      {option.label}
                    </GlangoActionButton>

                    <GlangoActionButton
                      type="button"
                      variant="ghost"
                      layout="pill"
                      aria-label={`${option.label} 숨기기`}
                      onClick={() => hideNavSectorProvider(option.id as NavSectorProvider)}
                      className="shrink-0 self-center px-2.5 py-2 text-[10px]"
                    >
                      {copy.settings.navSectorHide}
                    </GlangoActionButton>
                  </div>
                );
              })}
            </div>

            <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
              {copy.settings.navSectorFootnote}
            </p>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
