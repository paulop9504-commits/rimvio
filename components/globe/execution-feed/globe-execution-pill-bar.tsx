"use client";

import { Check, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import type { ExecutionFeedPill } from "@/lib/context-run/execution-feed-types";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeExecutionPillBarProps = {
  pills: readonly ExecutionFeedPill[];
  activePillId: string | null;
  expandedPillId: string | null;
  onTogglePill: (pillId: string) => void;
  className?: string;
};

function pillStatusIcon(status: ExecutionFeedPill["status"]) {
  if (status === "running" || status === "pending") {
    return <Loader2 className="size-3 animate-spin text-[#7eb8ff]" aria-hidden />;
  }
  if (status === "waiting_user") {
    return <span className="size-2 rounded-full bg-[#ff9f0a] shadow-[0_0_6px_rgba(255,159,10,0.5)]" />;
  }
  if (status === "done") {
    return <Check className="size-3 text-[#34c759]" aria-hidden />;
  }
  return <span className="size-2 rounded-full bg-white/40" />;
}

/** Claude-style horizontal step pills — tap to expand past steps. */
export function GlobeExecutionPillBar({
  pills,
  activePillId,
  expandedPillId,
  onTogglePill,
  className,
}: GlobeExecutionPillBarProps) {
  if (pills.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}
      data-globe-execution-pill-bar
    >
      {pills.map((pill) => {
        const active = pill.id === activePillId;
        const expanded = pill.id === expandedPillId;
        const label =
          pill.status === "done" && pill.resultKo
            ? pill.resultKo
            : pill.labelKo;

        return (
          <button
            key={pill.id}
            type="button"
            onClick={() => onTogglePill(pill.id)}
            className={cn(
              "inline-flex max-w-[9.5rem] shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-left ring-1 transition-colors",
              active || expanded
                ? "bg-white/14 text-white ring-white/22"
                : "bg-white/6 text-white/82 ring-white/10 hover:bg-white/10",
            )}
            aria-expanded={expanded}
            data-globe-execution-pill
            data-globe-execution-pill-status={pill.status}
          >
            {pillStatusIcon(pill.status)}
            <span className="min-w-0 truncate text-[10px] font-semibold">{label}</span>
            {pill.status === "done" ? (
              expanded ? (
                <ChevronUp className="size-3 shrink-0 text-white/50" aria-hidden />
              ) : (
                <ChevronDown className="size-3 shrink-0 text-white/50" aria-hidden />
              )
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function GlobeExecutionGoalPill({
  goalKo,
  className,
}: {
  goalKo: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/8 px-2.5 py-1 ring-1 ring-white/12",
        className,
      )}
      data-globe-execution-goal-pill
    >
      <span className="text-[9px] font-bold uppercase tracking-wide text-white/45">
        {copy.globe.executionFeed.goalEyebrow}
      </span>
      <span className="truncate text-[10px] font-medium text-white/88">{goalKo}</span>
    </div>
  );
}
