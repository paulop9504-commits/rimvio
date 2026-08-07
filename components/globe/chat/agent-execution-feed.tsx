"use client";

/**
 * Execution Feed — chat-flow timeline (no card / border / shadow).
 * Spec: append-only, muted completed, running with pulse, short EN verbs.
 */

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { AgentExecutionFeedView } from "@/lib/ui/build-agent-execution-feed";
import { cn } from "@/lib/utils";

export type AgentExecutionFeedProps = {
  readonly view: AgentExecutionFeedView;
  readonly className?: string;
};

export function AgentExecutionFeed({
  view,
  className,
}: AgentExecutionFeedProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [view.rows.length, view.running, view.rows[view.rows.length - 1]?.id]);

  return (
    <div
      ref={scrollerRef}
      className={cn(
        "w-full max-h-[min(32vh,240px)] overflow-y-auto overscroll-contain",
        className,
      )}
      data-agent-execution-feed
      data-running={view.running ? "1" : "0"}
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {view.rows.map((row) => {
          const isRunning = row.status === "running";
          const isError = row.status === "error";
          return (
            <motion.div
              key={row.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex items-baseline gap-2 py-[3px]"
              data-feed-row={row.status}
            >
              {isRunning ? (
                <span
                  className="mt-[0.35em] h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[#1d1d1f]"
                  aria-hidden
                />
              ) : isError ? (
                <span
                  className="shrink-0 text-[12px] font-normal leading-[1.7] text-[#ff3b30]"
                  aria-hidden
                >
                  ×
                </span>
              ) : (
                <span
                  className="shrink-0 text-[12px] font-normal leading-[1.7] text-[#86868b]/60"
                  aria-hidden
                >
                  ✓
                </span>
              )}
              <p
                className={cn(
                  "min-w-0 text-[12.5px] font-normal leading-[1.7] tracking-normal",
                  isRunning && "text-[#1d1d1f]",
                  !isRunning && !isError && "text-[#86868b]/60",
                  isError && "text-[#ff3b30]",
                )}
              >
                {row.label}
              </p>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
