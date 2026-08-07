"use client";

/**
 * Execution Feed — Cursor-style single-line roll.
 * One line at a time: previous exits upward, next enters from below.
 * Even when the tape batches many events, UI paces the reveal slowly.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type {
  AgentExecutionFeedRow,
  AgentExecutionFeedView,
} from "@/lib/ui/build-agent-execution-feed";
import { cn } from "@/lib/utils";

export type AgentExecutionFeedProps = {
  readonly view: AgentExecutionFeedView;
  readonly className?: string;
};

/** How long each stage line stays readable before rolling up (Cursor-slow). */
const REVEAL_HOLD_MS = 1150;
/** Framer roll duration — slower than default Cursor tick (~0.9–1.1s). */
const ROLL_DURATION_S = 0.95;

export function AgentExecutionFeed({
  view,
  className,
}: AgentExecutionFeedProps) {
  const [revealIndex, setRevealIndex] = useState(0);
  const [utteranceKey, setUtteranceKey] = useState(view.utterance);

  // New agent turn → reset paced reveal.
  useEffect(() => {
    if (view.utterance !== utteranceKey) {
      setUtteranceKey(view.utterance);
      setRevealIndex(0);
    }
  }, [view.utterance, utteranceKey]);

  const maxIndex = Math.max(0, view.rows.length - 1);

  // Pace: walk revealIndex toward the latest tape row, one hold at a time.
  useEffect(() => {
    if (view.rows.length === 0) return;
    if (revealIndex >= maxIndex) return;
    const id = window.setTimeout(() => {
      setRevealIndex((i) => Math.min(i + 1, maxIndex));
    }, REVEAL_HOLD_MS);
    return () => window.clearTimeout(id);
  }, [view.rows.length, revealIndex, maxIndex]);

  // Clamp if tape shrinks (rare).
  useEffect(() => {
    if (revealIndex > maxIndex) setRevealIndex(maxIndex);
  }, [revealIndex, maxIndex]);

  const row = view.rows[revealIndex] ?? null;
  if (!row) return null;

  const display = resolveDisplayStatus(row, revealIndex, maxIndex, view.running);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        // Extra height so exit/enter can fully travel upward without clipping mid-roll.
        "h-[2.1em]",
        className,
      )}
      data-agent-execution-feed
      data-running={view.running ? "1" : "0"}
      data-mode="rolling-ticker"
      data-reveal-index={revealIndex}
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={row.id}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -18 }}
          transition={{
            duration: ROLL_DURATION_S,
            ease: [0.22, 1, 0.36, 1],
            opacity: { duration: ROLL_DURATION_S * 0.85, ease: "easeInOut" },
          }}
          className="absolute inset-x-0 top-0 flex items-baseline gap-2"
          data-feed-row={display}
        >
          {display === "running" ? (
            <span
              className="mt-[0.45em] h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[#1d1d1f]"
              aria-hidden
            />
          ) : display === "error" ? (
            <span
              className="shrink-0 text-[12.5px] font-normal leading-[1.7] text-[#ff3b30]"
              aria-hidden
            >
              ×
            </span>
          ) : (
            <span
              className="shrink-0 text-[12.5px] font-normal leading-[1.7] text-[#86868b]/60"
              aria-hidden
            >
              ✓
            </span>
          )}
          <p
            className={cn(
              "min-w-0 truncate text-[12.5px] font-normal leading-[1.7] tracking-normal",
              display === "running" && "text-[#1d1d1f]",
              display === "done" && "text-[#86868b]/60",
              display === "error" && "text-[#ff3b30]",
            )}
          >
            {row.label}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function resolveDisplayStatus(
  row: AgentExecutionFeedRow,
  revealIndex: number,
  maxIndex: number,
  tapeRunning: boolean,
): AgentExecutionFeedRow["status"] {
  if (row.status === "error") return "error";
  // Still catching up to tape tip, or on tip while agent still working → alive dot.
  if (revealIndex < maxIndex) return "done";
  if (tapeRunning) return "running";
  return row.status === "running" ? "running" : "done";
}
