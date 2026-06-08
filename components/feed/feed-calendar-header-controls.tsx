"use client";

import Link from "next/link";
import { Calendar, Maximize2 } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

type FeedCalendarHeaderControlsProps = {
  badgeCount: number;
  onOpenSheet: () => void;
  className?: string;
};

/** Feed header — sheet (📅) + full calendar (⤢) split control. */
export function FeedCalendarHeaderControls({
  badgeCount,
  onOpenSheet,
  className,
}: FeedCalendarHeaderControlsProps) {
  const copy = useCopy();

  return (
    <div
      className={cn(
        "flex items-center rounded-full bg-white/[0.06] p-0.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]",
        className,
      )}
    >
      <button
        type="button"
        aria-label={copy.nav.calendar}
        onClick={onOpenSheet}
        className="relative flex size-8 items-center justify-center rounded-full text-white transition-opacity hover:bg-white/[0.06] active:scale-95 sm:size-9"
      >
        <Calendar className="size-[1.15rem] sm:size-5" strokeWidth={2.1} />
        <span
          className={cn(
            "absolute -right-0.5 -top-0.5 flex size-4 min-w-4 items-center justify-center rounded-full bg-rimvio-base px-0.5 text-[9px] font-extrabold tabular-nums leading-none text-rimvio-neon-amber shadow-[0_0_8px_rgba(255,214,10,0.35)] sm:-right-1 sm:-top-1 sm:size-[1.125rem] sm:min-w-[1.125rem] sm:text-[10px]",
            badgeCount <= 0 && "pointer-events-none opacity-0",
          )}
          aria-hidden={badgeCount <= 0}
        >
          {badgeCount > 9 ? "9+" : badgeCount || "1"}
        </span>
      </button>
      <Link
        href="/calendar"
        aria-label={copy.calendar.fullScreen}
        title={copy.calendar.fullScreen}
        className="flex size-7 items-center justify-center rounded-full text-white/75 transition-colors hover:bg-white/[0.08] hover:text-white active:scale-95 sm:size-8"
      >
        <Maximize2 className="size-3.5 sm:size-4" strokeWidth={2.2} />
      </Link>
    </div>
  );
}
