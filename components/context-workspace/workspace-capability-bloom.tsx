"use client";

/**
 * Capability bloom — Object hub with ≤4 callouts.
 * Clean Apple sheet: soft chips, one expanded panel, spring stagger.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, MapPin, Sparkles, Star, Wallet, Zap } from "lucide-react";
import type { WorkspaceCapabilityCallout } from "@/lib/context-workspace/capability-callout";
import { cn } from "@/lib/utils";

export type WorkspaceCapabilityBloomProps = {
  callouts: readonly WorkspaceCapabilityCallout[];
  hubLabelKo: string;
  className?: string;
  onAction?: () => void;
};

function CapIcon({
  icon,
  className,
}: {
  icon: WorkspaceCapabilityCallout["icon"];
  className?: string;
}) {
  const cls = cn("h-3.5 w-3.5", className);
  switch (icon) {
    case "sparkle":
      return <Sparkles className={cls} strokeWidth={2.4} />;
    case "price":
      return <Wallet className={cls} strokeWidth={2.4} />;
    case "star":
      return <Star className={cls} strokeWidth={2.4} />;
    case "pin":
      return <MapPin className={cls} strokeWidth={2.4} />;
    case "calendar":
      return <Calendar className={cls} strokeWidth={2.4} />;
    case "bolt":
      return <Zap className={cls} strokeWidth={2.4} />;
  }
}

/** Slot positions around hub — sparse cross, not a crowded ring. */
const SLOT: Record<number, string> = {
  0: "left-1/2 top-0 -translate-x-1/2",
  1: "left-0 top-[42%] -translate-y-1/2",
  2: "right-0 top-[42%] -translate-y-1/2",
  3: "left-1/2 bottom-0 -translate-x-1/2",
};

export function WorkspaceCapabilityBloom({
  callouts,
  hubLabelKo,
  className,
  onAction,
}: WorkspaceCapabilityBloomProps) {
  const [activeId, setActiveId] = useState<string | null>(
    () => callouts[0]?.id ?? null,
  );

  useEffect(() => {
    if (callouts.length === 0) {
      setActiveId(null);
      return;
    }
    setActiveId((prev) =>
      prev && callouts.some((c) => c.id === prev) ? prev : callouts[0]!.id,
    );
  }, [callouts]);

  if (callouts.length === 0) return null;

  const active = callouts.find((c) => c.id === activeId) ?? callouts[0]!;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative mx-auto h-[168px] w-full max-w-[340px]">
        {callouts.length >= 3 ? (
          <>
            <div
              className="pointer-events-none absolute left-1/2 top-[18%] h-[38%] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#d1d6db]/70 to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute left-[18%] top-1/2 h-px w-[64%] -translate-y-1/2 bg-gradient-to-r from-transparent via-[#d1d6db]/70 to-transparent"
              aria-hidden
            />
          </>
        ) : null}
        {/* Hub */}
        <div className="absolute left-1/2 top-1/2 z-[1] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          <motion.div
            layout
            className="rounded-full bg-[#191f28] px-3.5 py-2 text-[12px] font-semibold tracking-[-0.02em] text-white shadow-[0_8px_24px_rgba(25,31,40,0.22)]"
          >
            {hubLabelKo}
          </motion.div>
        </div>

        {callouts.slice(0, 4).map((c, i) => {
          const on = c.id === active.id;
          return (
            <motion.button
              key={c.id}
              type="button"
              initial={{ opacity: 0, scale: 0.86 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 380,
                damping: 28,
                delay: 0.04 + i * 0.05,
              }}
              className={cn(
                "absolute z-[2] max-w-[148px] rounded-[16px] px-3 py-2 text-left shadow-[0_6px_20px_rgba(25,31,40,0.1)] ring-1 transition-[box-shadow,background-color]",
                SLOT[i] ?? SLOT[0],
                on
                  ? "bg-[#191f28] text-white ring-transparent"
                  : "bg-white/95 text-[#191f28] ring-black/[0.05] backdrop-blur-sm",
              )}
              onClick={() => {
                setActiveId(c.id);
                if (c.kind === "action") onAction?.();
              }}
              aria-pressed={on}
            >
              <span
                className={cn(
                  "flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.04em]",
                  on ? "text-white/70" : "text-[#8b95a1]",
                )}
              >
                <CapIcon icon={c.icon} />
                {c.labelKo}
              </span>
              <span className="mt-0.5 block truncate text-[12px] font-semibold leading-snug tracking-[-0.02em]">
                {c.valueKo}
              </span>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className="rounded-[18px] bg-[#f9fafb] px-3.5 py-3"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#191f28]">
              <CapIcon icon={active.icon} className="text-[#3182f6]" />
              {active.labelKo}
            </p>
            {active.confidence != null ? (
              <span className="text-[11px] font-medium tabular-nums text-[#8b95a1]">
                {Math.round(active.confidence * 100)}%
              </span>
            ) : null}
          </div>
          <ul className="mt-2 space-y-1.5">
            {active.linesKo.map((line) => (
              <li
                key={line}
                className="flex items-start gap-2 text-[13px] leading-snug text-[#4e5968]"
              >
                <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-[#3182f6]/80" />
                <span className="min-w-0 flex-1">{line}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
