"use client";

import type { ContextRecallSummary } from "@/lib/globe/context-hub/summarize-context-recall";
import { formatContextRecallDetailLabel } from "@/lib/globe/context-hub/summarize-context-recall";
import { cn } from "@/lib/utils";

export type GlobeContextRecallBadgeProps = {
  summary: ContextRecallSummary;
  className?: string;
};

/** Compact recall line — confirmed lodging / flight legs for active Context. */
export function GlobeContextRecallBadge({
  summary,
  className,
}: GlobeContextRecallBadgeProps) {
  const label = formatContextRecallDetailLabel(summary);
  if (!label) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full bg-[#e8f0fe] px-3 py-1.5 ring-1 ring-[#007aff]/15",
        className,
      )}
      data-globe-context-recall-badge
      role="status"
    >
      <span className="size-1.5 shrink-0 rounded-full bg-[#34c759]" aria-hidden />
      <span className="truncate text-[11px] font-semibold text-[#1a4fad]">{label}</span>
    </div>
  );
}
