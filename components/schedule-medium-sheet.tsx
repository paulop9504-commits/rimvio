"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Calendar, Check, ClipboardCopy, X } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import { isStandalonePwa } from "@/lib/platform/device";
import {
  readScheduleMedium,
  SCHEDULE_MEDIUM_OPTIONS,
  SCHEDULE_MEDIUM_UPDATED,
  type ScheduleMedium,
} from "@/lib/preferences/schedule-medium";
import { cn } from "@/lib/utils";

const ICONS = {
  glango: Bell,
  google_calendar: Calendar,
  copy: ClipboardCopy,
} as const;

type ScheduleMediumSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionLabel?: string | null;
  onSelect: (medium: ScheduleMedium) => void;
};

export function ScheduleMediumSheet({
  open,
  onOpenChange,
  actionLabel,
  onSelect,
}: ScheduleMediumSheetProps) {
  const copy = useCopy();
  const [defaultMedium, setDefaultMedium] = useState<ScheduleMedium>("glango");
  const [standalone, setStandalone] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDefaultMedium(readScheduleMedium());
    setStandalone(isStandalonePwa());

    const onUpdate = () => setDefaultMedium(readScheduleMedium());
    window.addEventListener(SCHEDULE_MEDIUM_UPDATED, onUpdate);
    return () => window.removeEventListener(SCHEDULE_MEDIUM_UPDATED, onUpdate);
  }, [open]);

  if (!mounted) {
    return null;
  }

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
            aria-labelledby="schedule-medium-sheet-title"
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
                  id="schedule-medium-sheet-title"
                  className="text-[15px] font-semibold tracking-tight"
                >
                  {copy.settings.scheduleSheetTitle}
                </h2>
                <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
                  {copy.settings.scheduleSheetHint(actionLabel?.trim() || "예약")}
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

            <div className="mt-4 space-y-2">
              {SCHEDULE_MEDIUM_OPTIONS.map((option) => {
                const Icon = ICONS[option.id];
                const isDefault = defaultMedium === option.id;
                const showPwaHint =
                  option.id === "glango" && !standalone && isDefault;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      onSelect(option.id);
                      onOpenChange(false);
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-2xl px-3.5 py-3 text-left transition-all active:scale-[0.99]",
                      isDefault
                        ? "bg-[#007AFF]/8 ring-2 ring-[#007AFF]/30"
                        : "bg-white ring-1 ring-black/[0.06]"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl",
                        isDefault
                          ? "bg-[#007AFF] text-white"
                          : "bg-[#f2f2f7] text-foreground"
                      )}
                      aria-hidden
                    >
                      {isDefault ? (
                        <Check className="size-5" strokeWidth={2.5} />
                      ) : (
                        <Icon className="size-5" strokeWidth={2} />
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">
                          {option.emoji} {option.label}
                        </span>
                        {isDefault ? (
                          <span className="rounded-full bg-[#007AFF]/10 px-2 py-0.5 text-[10px] font-semibold text-[#007AFF]">
                            {copy.settings.scheduleBadge}
                          </span>
                        ) : null}
                        {option.badge && !isDefault ? (
                          <span className="rounded-full bg-[#FF9500]/12 px-2 py-0.5 text-[10px] font-semibold text-[#C93400]">
                            {option.badge}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
                        {option.hint}
                      </span>
                      {showPwaHint ? (
                        <span className="mt-1.5 block text-[11px] font-medium text-[#FF9500]">
                          {copy.settings.schedulePwaHint}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
              {copy.settings.scheduleSheetFootnote}
            </p>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
