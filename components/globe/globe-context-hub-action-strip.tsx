"use client";

import { copy } from "@/lib/copy/human-ko";
import type { ContextHubTimelineRow } from "@/lib/globe/context-hub/build-context-hub-timeline-rows";
import { cn } from "@/lib/utils";

export type GlobeContextHubActionStripProps = {
  rows: readonly ContextHubTimelineRow[];
  className?: string;
};

/** Compact append-only Context timeline — Hub commits + Engine milestones. */
export function GlobeContextHubActionStrip({
  rows,
  className,
}: GlobeContextHubActionStripProps) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-2xl bg-white/90 px-3 py-2.5 shadow-sm ring-1 ring-black/[0.05]",
        className,
      )}
      data-globe-context-hub-action-strip
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8e8e93]">
        {copy.globe.hubActionLog.title}
      </p>
      <ul className="mt-1.5 space-y-1">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-center gap-2 text-[12px] leading-snug text-[#3a3a3c]"
            data-timeline-kind={row.kind}
            data-provider-member={row.providerMemberId}
          >
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                row.status === "success"
                  ? "bg-[#34c759]"
                  : row.status === "failed"
                    ? "bg-[#ff3b30]"
                    : "bg-[#ff9500]",
              )}
              aria-hidden
            />
            <span className="min-w-0 truncate font-medium">{row.labelKo}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
