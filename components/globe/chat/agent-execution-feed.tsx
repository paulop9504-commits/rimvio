"use client";

/**
 * Execution Feed — scrolling Agent Activity (not a mutating summary card).
 * User command stays above; steps append below and auto-scroll.
 */

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
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
      className={cn(
        "w-full overflow-hidden rounded-2xl bg-[#f5f5f7]/95 px-3 py-2.5 ring-1 ring-black/[0.04]",
        className,
      )}
      data-agent-execution-feed
      data-running={view.running ? "1" : "0"}
    >
      <p className="text-[10px] font-semibold tracking-wide text-[#86868b]">
        {view.titleKo}
      </p>

      <div
        ref={scrollerRef}
        className="mt-2 max-h-[min(28vh,220px)] space-y-1 overflow-y-auto overscroll-contain pr-0.5"
      >
        <AnimatePresence initial={false}>
          {view.rows.map((row) => {
            const isRunning = row.status === "running";
            return (
              <motion.div
                key={row.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className={cn(
                  "flex gap-2",
                  isRunning ? "items-start py-1" : "items-center py-0.5",
                )}
                data-feed-row={row.status}
              >
                {isRunning ? (
                  <Loader2
                    className="mt-0.5 size-3.5 shrink-0 animate-spin text-[#3182f6]"
                    strokeWidth={2.25}
                    aria-hidden
                  />
                ) : (
                  <span
                    className="mt-px flex h-3.5 w-3.5 shrink-0 items-center justify-center text-[11px] font-bold text-[#34c759]"
                    aria-hidden
                  >
                    ✓
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "leading-snug",
                      isRunning
                        ? "text-[13px] font-semibold text-[#1d1d1f]"
                        : "text-[12px] font-medium text-[#6e6e73]",
                    )}
                  >
                    {isRunning ? `▶ ${row.labelKo}` : row.labelKo}
                    {row.metricKo ? (
                      <span className="ml-1 font-normal text-[#aeaeb2]">
                        · {row.metricKo}
                      </span>
                    ) : null}
                  </p>
                  {isRunning && row.detailKo ? (
                    <p className="mt-0.5 text-[11px] leading-snug text-[#86868b]">
                      {row.detailKo}
                    </p>
                  ) : null}
                  {isRunning && view.progressPercent != null ? (
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#e8e8ed]">
                      <motion.div
                        className="h-full rounded-full bg-[#3182f6]"
                        initial={{ width: "8%" }}
                        animate={{
                          width: `${Math.max(8, view.progressPercent)}%`,
                        }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      />
                    </div>
                  ) : null}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
