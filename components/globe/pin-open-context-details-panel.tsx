"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type PinOpenContextDetailsPanelProps = {
  summary: string;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  className?: string;
  children: ReactNode;
};

/** Pin sheet — foldable context block (moments · share · evidence). */
export function PinOpenContextDetailsPanel({
  summary,
  expanded,
  onExpandedChange,
  className,
  children,
}: PinOpenContextDetailsPanelProps) {
  return (
    <div
      className={cn(
        "relative z-30 flex shrink-0 flex-col border-t border-border bg-background",
        expanded && "min-h-0 flex-1",
        className,
      )}
      data-pin-context-details
      data-pin-context-details-expanded={expanded ? "true" : "false"}
    >
      <button
        type="button"
        onClick={() => onExpandedChange(!expanded)}
        className="flex w-full shrink-0 items-center justify-between gap-3 px-4 py-3 text-left text-foreground transition active:opacity-85"
        aria-expanded={expanded}
        aria-controls="pin-context-details-body"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {expanded
              ? copy.globe.pinContextDetailsCollapse
              : copy.globe.pinContextDetailsExpand}
          </span>
          <span className="mt-0.5 block truncate text-[13px] font-semibold">
            {summary}
          </span>
        </span>
        {expanded ? (
          <ChevronDown className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        ) : (
          <ChevronUp className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        )}
      </button>

      {expanded ? (
        <div
          id="pin-context-details-body"
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain border-t border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <section className="space-y-4 px-4 py-4">{children}</section>
        </div>
      ) : null}
    </div>
  );
}
