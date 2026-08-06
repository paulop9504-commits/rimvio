"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import type { CursorAgentTrailView } from "@/lib/ui/build-cursor-agent-trail-view";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type CursorAgentActivityTrailProps = {
  view: CursorAgentTrailView;
  className?: string;
};

/**
 * Cursor Agent Trail — light hierarchy matching Cursor IDE:
 * Thought Xs · phase verb (spin) · nested Auto step · Exploring · Waiting.
 */
export function CursorAgentActivityTrail({
  view,
  className,
}: CursorAgentActivityTrailProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!view.running) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 700);
    return () => window.clearInterval(id);
  }, [view.running, view.nested?.id]);

  const thoughtSec = Math.max(
    1,
    Math.round((nowMs - view.startedAtMs) / 1000),
  );
  const liveThought = view.running
    ? copy.globe.activityTrail.thoughtFor(thoughtSec)
    : view.thoughtLineKo;

  return (
    <div
      className={cn("flex flex-col gap-1.5 px-0.5 py-0.5", className)}
      data-cursor-agent-activity-trail
      data-finished={view.finished ? "1" : "0"}
      data-running={view.running ? "1" : "0"}
    >
      <p className="text-[11px] leading-snug text-[#86868b]">{liveThought}</p>

      {view.running && view.phaseLineKo ? (
        <div className="flex items-center gap-1.5">
          <Loader2
            className="size-3 shrink-0 animate-spin text-[#aeaeb2]"
            strokeWidth={2.25}
            aria-hidden
          />
          <motion.p
            key={view.phaseLineKo}
            initial={{ opacity: 0.4 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="text-[11px] leading-snug text-[#86868b]"
          >
            {view.phaseLineKo}
          </motion.p>
        </div>
      ) : null}

      {!view.running ? (
        <p className="text-[11px] leading-snug text-[#86868b]">
          {view.summaryLineKo}
        </p>
      ) : null}

      <p className="text-[13px] font-medium leading-[1.45] text-[#1d1d1f]">
        {view.goalKo}
      </p>

      {view.exploredLineKo ? (
        <p className="text-[11px] leading-snug text-[#86868b]">
          {view.exploredLineKo}
        </p>
      ) : null}

      {view.nested ? (
        <div className="ml-2.5 border-l border-black/[0.06] pl-2.5 pt-0.5">
          <div className="flex min-w-0 items-baseline gap-1.5">
            {view.nested.active ? (
              <Loader2
                className="mt-0.5 size-3 shrink-0 animate-spin text-[#3182f6]"
                strokeWidth={2.25}
                aria-hidden
              />
            ) : (
              <Sparkles
                className="mt-0.5 size-3 shrink-0 text-[#aeaeb2]"
                strokeWidth={2}
                aria-hidden
              />
            )}
            <span className="min-w-0 truncate text-[12px] font-semibold leading-snug text-[#1d1d1f]">
              {view.nested.titleKo}
            </span>
            {view.nested.auto ? (
              <span className="shrink-0 text-[10px] font-medium tracking-wide text-[#aeaeb2]">
                {copy.globe.activityTrail.autoBadge}
              </span>
            ) : null}
          </div>
          <AnimatePresence mode="wait">
            {view.nested.detailKo ? (
              <motion.p
                key={view.nested.detailKo}
                initial={{ opacity: 0.35 }}
                animate={{
                  opacity: view.nested.active ? [0.45, 0.9, 0.45] : 0.72,
                }}
                exit={{ opacity: 0 }}
                transition={
                  view.nested.active
                    ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                    : { duration: 0.2 }
                }
                className="mt-0.5 pl-[1.125rem] text-[11px] leading-snug text-[#86868b]"
              >
                {view.nested.detailKo}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}

      <AnimatePresence>
        {view.waitLineKo ? (
          <motion.p
            key="wait"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 0.95, 0.5] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="text-[11px] leading-snug text-[#86868b]"
          >
            {view.waitLineKo}
          </motion.p>
        ) : view.doneLineKo ? (
          <motion.p
            key="done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[11px] leading-snug text-[#6e6e73]"
          >
            {view.doneLineKo}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
