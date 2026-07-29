"use client";

/**
 * Empty Globe first-paint — 20–30s loop:
 * Travel plan → Place discovery → AI execute → Recall
 * One composition on a living-globe silhouette (no new page).
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

const STAGE_MS = 7_000;
const TOTAL_MS = STAGE_MS * 4;

const PIN_LAYOUT = [
  { x: 38, y: 42 },
  { x: 62, y: 36 },
  { x: 55, y: 58 },
  { x: 42, y: 62 },
] as const;

export function GlobeContextFirstDemo({ className }: { className?: string }) {
  const copy = useCopy();
  const stages = copy.globe.firstDemo.stages;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % stages.length);
    }, STAGE_MS);
    return () => window.clearInterval(id);
  }, [stages.length]);

  const stage = stages[index]!;
  const visiblePins = index + 1;

  return (
    <div
      className={cn("flex w-full flex-col items-center gap-3", className)}
      data-rimvio-globe-first-demo
      aria-live="polite"
    >
      <div className="relative aspect-square w-[9.5rem]">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#d8e6f8] via-[#eef3f9] to-[#c5d4e8] shadow-inner ring-1 ring-[#02204712]" />
        <div className="absolute inset-[12%] rounded-full border border-dashed border-[#3182f6]/25" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full opacity-40">
          <div className="absolute -left-1/4 top-1/3 h-[2px] w-[150%] -rotate-[18deg] bg-[#02204718]" />
          <div className="absolute -left-1/4 top-1/2 h-[2px] w-[150%] rotate-[12deg] bg-[#02204714]" />
        </div>

        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 size-full"
          aria-hidden
        >
          {PIN_LAYOUT.slice(0, Math.max(0, visiblePins - 1)).map((from, i) => {
            const to = PIN_LAYOUT[i + 1];
            if (!to) return null;
            return (
              <motion.line
                key={`arc-${i}-${index}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#3182f6"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeDasharray="3 3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.55 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              />
            );
          })}
        </svg>

        {PIN_LAYOUT.map((pin, i) => {
          const active = i < visiblePins;
          const current = i === index;
          return (
            <motion.span
              key={`pin-${i}`}
              className={cn(
                "absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-sm",
                current ? "bg-[#3182f6]" : active ? "bg-[#3182f6]/70" : "bg-[#02204722]",
              )}
              style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
              initial={false}
              animate={{
                scale: current ? 1.35 : active ? 1 : 0.55,
                opacity: active ? 1 : 0.35,
              }}
              transition={{ type: "spring", stiffness: 380, damping: 24 }}
            />
          );
        })}
      </div>

      <div className="flex w-full max-w-[16rem] flex-wrap justify-center gap-1.5">
        {stages.map((row, i) => (
          <span
            key={row.id}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-tight transition-colors",
              i === index
                ? "bg-[#3182f6] text-white shadow-sm"
                : i < index
                  ? "bg-[#e8f1fe] text-[#1b64da] ring-1 ring-[#3182f6]/25"
                  : "bg-[#f2f4f6] text-[#4e5968] ring-1 ring-[#02204714]",
            )}
          >
            {row.label}
          </span>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={stage.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.28 }}
          className="min-h-[2.5rem] max-w-[17rem] text-[12px] leading-relaxed text-[#6b7684]"
        >
          {stage.caption}
        </motion.p>
      </AnimatePresence>

      <div className="h-0.5 w-full max-w-[10rem] overflow-hidden rounded-full bg-[#0220470f]">
        <motion.div
          key={stage.id}
          className="h-full rounded-full bg-[#3182f6]/70"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: STAGE_MS / 1000, ease: "linear" }}
        />
      </div>

      <span className="sr-only">
        {copy.globe.firstDemo.loopHint} ({TOTAL_MS / 1000}s)
      </span>
    </div>
  );
}
