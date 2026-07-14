"use client";

import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type GlobeRealityCommitPulseBadgeProps = {
  visible: boolean;
  label: string;
  className?: string;
};

/** Commit Receipt follow-through — short “반영됨” chip over the focused pin. */
export function GlobeRealityCommitPulseBadge({
  visible,
  label,
  className,
}: GlobeRealityCommitPulseBadgeProps) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.96 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className={cn(
            "pointer-events-none absolute left-1/2 top-[40%] z-[70] -translate-x-1/2",
            className,
          )}
          data-globe-reality-commit-pulse
          aria-live="polite"
        >
          <div className="relative flex items-center gap-2 rounded-full bg-white/95 px-3.5 py-2 shadow-[0_10px_28px_rgba(16,185,129,0.28)] ring-1 ring-emerald-200/90 backdrop-blur-sm">
            <span
              className="relative flex size-2.5 shrink-0"
              aria-hidden
            >
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/70" />
              <span className="relative size-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]" />
            </span>
            <span className="text-[13px] font-semibold tracking-tight text-[#191f28]">
              {label}
            </span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
