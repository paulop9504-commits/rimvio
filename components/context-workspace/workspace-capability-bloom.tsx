"use client";

/**
 * Capability bloom — Object hub with ≤4 callouts + thin Live Pulse.
 * Clean Apple sheet: soft chips, evidence under Insight, spring stagger.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  Check,
  MapPin,
  Sparkles,
  Star,
  Wallet,
  Zap,
} from "lucide-react";
import type {
  CapabilityLiveSignal,
  WorkspaceCapabilityCallout,
} from "@/lib/context-workspace/capability-callout";
import { cn } from "@/lib/utils";

export type WorkspaceCapabilityBloomProps = {
  callouts: readonly WorkspaceCapabilityCallout[];
  liveSignals?: readonly CapabilityLiveSignal[];
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

function LivePulse({
  signals,
}: {
  signals: readonly CapabilityLiveSignal[];
}) {
  if (signals.length === 0) return null;
  return (
    <div className="flex items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#191f28] px-2 py-1 text-[10px] font-bold tracking-[0.06em] text-white">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#4ade80]" />
        </span>
        LIVE
      </span>
      {signals.map((s) => (
        <span
          key={s.id}
          className={cn(
            "inline-flex shrink-0 items-baseline gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] shadow-[0_2px_10px_rgba(25,31,40,0.06)] ring-1 ring-black/[0.04]",
            s.tone === "good" && "text-[#191f28]",
            s.tone === "warn" && "text-[#b45309]",
            s.tone === "neutral" && "text-[#4e5968]",
          )}
        >
          <span className="font-medium text-[#8b95a1]">{s.labelKo}</span>
          <span className="font-semibold tabular-nums tracking-[-0.02em] text-[#191f28]">
            {s.valueKo}
          </span>
        </span>
      ))}
    </div>
  );
}

export function WorkspaceCapabilityBloom({
  callouts,
  liveSignals = [],
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

  if (callouts.length === 0 && liveSignals.length === 0) return null;

  const active =
    callouts.find((c) => c.id === activeId) ?? callouts[0] ?? null;

  return (
    <div className={cn("space-y-3", className)}>
      <LivePulse signals={liveSignals} />

      {callouts.length > 0 && active ? (
        <>
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
                      "flex items-center gap-1 text-[10px] font-semibold tracking-[0.02em]",
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
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#3182f6] ring-1 ring-[#3182f6]/15">
                    {Math.round(active.confidence * 100)}%
                  </span>
                ) : null}
              </div>

              {active.confidence != null ? (
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#e8ebef]">
                  <motion.div
                    className="h-full rounded-full bg-[#3182f6]"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.round(active.confidence * 100)}%`,
                    }}
                    transition={{ type: "spring", stiffness: 200, damping: 28 }}
                  />
                </div>
              ) : null}

              {active.evidence && active.evidence.length > 0 ? (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {active.evidence.map((ev) => (
                    <span
                      key={ev.id}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                        ev.present
                          ? "bg-white text-[#191f28] ring-1 ring-black/[0.05]"
                          : "bg-transparent text-[#c4c9d0]",
                      )}
                    >
                      {ev.present ? (
                        <Check
                          className="h-3 w-3 text-[#22c55e]"
                          strokeWidth={2.8}
                        />
                      ) : (
                        <span className="h-3 w-3 text-center text-[10px]">
                          ·
                        </span>
                      )}
                      {ev.labelKo}
                    </span>
                  ))}
                </div>
              ) : null}

              <ul className="mt-2.5 space-y-1.5">
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
        </>
      ) : null}
    </div>
  );
}
