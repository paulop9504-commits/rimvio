"use client";

import { memo, useCallback, useRef, type PointerEvent, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import { useFeedQueueSheetSnap } from "@/hooks/use-feed-queue-sheet-snap";
import { cn } from "@/lib/utils";

export type FeedExperienceSlotsDrawerProps = {
  collapsedSummary: string | null;
  slotCount: number;
  children: ReactNode;
  runLabel?: string;
  runDeferred?: boolean;
  onRunAt?: () => void;
  className?: string;
};

/** Bottom snap drawer — today's experience slots (YT Music queue). */
export const FeedExperienceSlotsDrawer = memo(function FeedExperienceSlotsDrawer({
  collapsedSummary,
  slotCount,
  children,
  runLabel,
  runDeferred = false,
  onRunAt,
  className,
}: FeedExperienceSlotsDrawerProps) {
  const copy = useCopy();
  const snap = useFeedQueueSheetSnap(false);
  const draggedRef = useRef(false);

  const bindDragHandle = useCallback(() => {
    return {
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
        draggedRef.current = false;
        snap.handlePointerDown(event.clientY);
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
        snap.handlePointerMove(event.clientY);
        if (Math.abs(event.movementY) > 2) {
          draggedRef.current = true;
        }
      },
      onPointerUp: (event: PointerEvent<HTMLButtonElement>) => {
        snap.handlePointerUp();
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        if (!draggedRef.current) {
          snap.toggle();
        }
      },
      onPointerCancel: () => {
        snap.handlePointerUp();
      },
    };
  }, [snap]);

  const summary =
    collapsedSummary?.trim() ||
    (slotCount > 0 ? copy.feed.today.count(slotCount) : copy.feed.today.empty);

  return (
    <section
      className={cn(
        "feed-experience-slots-drawer flex min-h-0 flex-col rounded-t-[1.75rem] border-t border-white/10 bg-[#0c0c0e] shadow-[0_-12px_40px_rgba(0,0,0,0.35)]",
        snap.expanded && "min-h-0 flex-1",
        className,
      )}
      data-feed-experience-drawer
      data-feed-drawer-expanded={snap.expanded ? "true" : "false"}
      aria-label={copy.feed.today.ariaLabel}
    >
      <button
        type="button"
        className="flex w-full shrink-0 flex-col items-center pt-2.5 touch-none"
        aria-expanded={snap.expanded}
        aria-label={snap.expanded ? copy.feed.queue.collapseAria : copy.feed.queue.expandAria}
        {...bindDragHandle()}
      >
        <span className="h-1 w-10 rounded-full bg-white/25" aria-hidden />
      </button>

      <header className="flex shrink-0 items-start justify-between gap-3 px-4 pb-2 pt-1">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={snap.toggle}
          aria-expanded={snap.expanded}
        >
          <p className="text-[10px] font-medium uppercase tracking-wide text-white/40">
            {copy.feed.experience.heroEyebrow}
          </p>
          <p className="mt-0.5 text-[15px] font-semibold text-white">
            {copy.feed.experience.heroTitle}
          </p>
          <p className="mt-1 truncate text-[12px] text-white/45">{summary}</p>
        </button>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {onRunAt && runLabel ? (
            <button
              type="button"
              disabled={runDeferred}
              onClick={onRunAt}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
                runDeferred
                  ? "cursor-not-allowed bg-white/[0.04] text-white/28"
                  : "border border-violet-300/30 bg-violet-500/15 text-violet-100/90 hover:bg-violet-500/22",
              )}
            >
              {runLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={snap.toggle}
            className="flex size-7 items-center justify-center rounded-full text-white/35 transition-colors hover:bg-white/[0.06] hover:text-white/60"
            aria-label={snap.expanded ? copy.feed.queue.collapseAria : copy.feed.queue.expandAria}
          >
            {snap.expanded ? (
              <ChevronDown className="size-5" strokeWidth={2.2} aria-hidden />
            ) : (
              <ChevronUp className="size-5" strokeWidth={2.2} aria-hidden />
            )}
          </button>
        </div>
      </header>

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden transition-opacity duration-200",
          snap.expanded ? "opacity-100" : "pointer-events-none max-h-0 opacity-0",
        )}
        aria-hidden={!snap.expanded}
      >
        {children}
      </div>
    </section>
  );
});
