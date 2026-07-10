"use client";

import { buildHubActionTimelineRows } from "@/lib/globe/resource/format-hub-action-timeline";
import type { HubAction } from "@/lib/globe/resource/hub-action-record";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeContextHubActionStripProps = {
  log: readonly HubAction[];
  className?: string;
};

/** Compact append-only action timeline for active Context. */
export function GlobeContextHubActionStrip({
  log,
  className,
}: GlobeContextHubActionStripProps) {
  const rows = buildHubActionTimelineRows(log);
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
            key={row.actionId}
            className="flex items-center gap-2 text-[12px] leading-snug text-[#3a3a3c]"
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
