"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type PinOpenContextDetailsPanelProps = {
  summary: string;
  resetKey?: string;
  /** When true, panel starts collapsed (more room for photos). */
  defaultCollapsed?: boolean;
  className?: string;
  onExpandedChange?: (expanded: boolean) => void;
  children: ReactNode;
};

/** Pin sheet — foldable context block (moments · share · evidence). */
export function PinOpenContextDetailsPanel({
  summary,
  resetKey,
  defaultCollapsed = false,
  className,
  onExpandedChange,
  children,
}: PinOpenContextDetailsPanelProps) {
  const [expanded, setExpanded] = useState(!defaultCollapsed);

  useEffect(() => {
    const next = !defaultCollapsed;
    setExpanded(next);
    onExpandedChange?.(next);
  }, [resetKey, defaultCollapsed, onExpandedChange]);

  const toggle = (next: boolean) => {
    setExpanded(next);
    onExpandedChange?.(next);
  };

  return (
    <div
      className={cn(
        "relative z-[1] shrink-0 border-t border-border bg-background",
        className,
      )}
      data-pin-context-details
      data-pin-context-details-expanded={expanded ? "true" : "false"}
    >
      <button
        type="button"
        onClick={() => toggle(!expanded)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-foreground transition active:opacity-85"
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
          className="max-h-[min(42dvh,400px)] overflow-y-auto overscroll-y-contain border-t border-border [scrollbar-width:none] md:max-h-[min(48dvh,480px)] [&::-webkit-scrollbar]:hidden"
        >
          <section className="space-y-4 px-4 py-4">{children}</section>
        </div>
      ) : null}
    </div>
  );
}
