"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type PinOpenBridgeMediaContextPagerProps = {
  media: ReactNode;
  summary: string;
  resetKey?: string;
  className?: string;
  children: ReactNode;
};

type SwipeAxis = "h" | "v" | null;

function useHorizontalSwipeHandoff(input: {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}) {
  const touchRef = useRef<{ x: number; y: number; axis: SwipeAxis }>({
    x: 0,
    y: 0,
    axis: null,
  });

  return {
    onTouchStart(event: React.TouchEvent) {
      const touch = event.touches[0];
      if (!touch) {
        return;
      }
      touchRef.current = { x: touch.clientX, y: touch.clientY, axis: null };
    },
    onTouchMove(event: React.TouchEvent) {
      const touch = event.touches[0];
      if (!touch || touchRef.current.axis) {
        return;
      }
      const dx = touch.clientX - touchRef.current.x;
      const dy = touch.clientY - touchRef.current.y;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        return;
      }
      touchRef.current.axis =
        Math.abs(dx) > Math.abs(dy) * 1.25 ? "h" : "v";
    },
    onTouchEnd(event: React.TouchEvent) {
      const touch = event.changedTouches[0];
      if (!touch || touchRef.current.axis !== "h") {
        touchRef.current.axis = null;
        return;
      }
      const dx = touch.clientX - touchRef.current.x;
      if (dx < -52) {
        input.onSwipeLeft();
      } else if (dx > 52) {
        input.onSwipeRight();
      }
      touchRef.current.axis = null;
    },
  };
}

/** Bridge pin — swipe media ↔ context text (two full pages). */
export function PinOpenBridgeMediaContextPager({
  media,
  summary,
  resetKey,
  className,
  children,
}: PinOpenBridgeMediaContextPagerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState<0 | 1>(0);

  const scrollToPage = useCallback((next: 0 | 1) => {
    const root = scrollerRef.current;
    if (!root) {
      return;
    }
    root.scrollTo({ left: next * root.clientWidth, behavior: "smooth" });
    setPage(next);
  }, []);

  useEffect(() => {
    setPage(0);
    scrollerRef.current?.scrollTo({ left: 0, behavior: "auto" });
  }, [resetKey]);

  const mediaSwipe = useHorizontalSwipeHandoff({
    onSwipeLeft: () => scrollToPage(1),
    onSwipeRight: () => {},
  });

  const contextSwipe = useHorizontalSwipeHandoff({
    onSwipeLeft: () => {},
    onSwipeRight: () => scrollToPage(0),
  });

  const syncPageFromScroll = useCallback(() => {
    const root = scrollerRef.current;
    if (!root || root.clientWidth <= 0) {
      return;
    }
    const next = root.scrollLeft >= root.clientWidth * 0.45 ? 1 : 0;
    setPage(next);
  }, []);

  return (
    <div
      className={cn("relative flex min-h-0 flex-1 flex-col", className)}
      data-pin-bridge-pager
      data-pin-bridge-page={page === 0 ? "media" : "context"}
    >
      <div className="pointer-events-none absolute inset-x-0 top-[3.25rem] z-30 flex justify-center px-4 md:pointer-events-auto">
        <div className="pointer-events-auto inline-flex rounded-full bg-black/45 p-0.5 ring-1 ring-white/15 backdrop-blur-md">
          <button
            type="button"
            onClick={() => scrollToPage(0)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition",
              page === 0 ? "bg-white text-black" : "text-white/75",
            )}
          >
            {copy.globe.bridgeMediaContextTabMoments}
          </button>
          <button
            type="button"
            onClick={() => scrollToPage(1)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition",
              page === 1 ? "bg-white text-black" : "text-white/75",
            )}
          >
            {copy.globe.bridgeMediaContextTabContext}
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={syncPageFromScroll}
      >
        <section
          className="relative h-full w-full shrink-0 snap-start overflow-hidden"
          aria-label={copy.globe.bridgeMediaContextTabMoments}
          {...mediaSwipe}
        >
          {media}
          {page === 0 ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-[5.5rem] z-30 flex justify-end px-4">
              <span className="rounded-full bg-black/55 px-3 py-1.5 text-[10px] font-semibold text-white/85 ring-1 ring-white/15 backdrop-blur-sm">
                {copy.globe.bridgeContextSwipeHint}
              </span>
            </div>
          ) : null}
        </section>

        <section
          className="flex h-full w-full shrink-0 snap-start flex-col overflow-hidden bg-background"
          aria-label={copy.globe.bridgeMediaContextTabContext}
          {...contextSwipe}
        >
          <div className="shrink-0 border-b border-border px-4 pb-3 pt-[3.75rem]">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
              {copy.globe.bridgeContextPageEyebrow}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[15px] font-semibold text-foreground">
              {summary}
            </p>
            <button
              type="button"
              onClick={() => scrollToPage(0)}
              className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground active:opacity-80"
            >
              <ChevronLeft className="size-4" aria-hidden />
              {copy.globe.bridgeMediaSwipeBackHint}
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="space-y-4">{children}</div>
          </div>
        </section>
      </div>

      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-3 z-40 flex justify-center gap-1.5",
          page === 1 && "bottom-[calc(0.75rem+env(safe-area-inset-bottom))]",
        )}
        aria-hidden
      >
        <span
          className={cn(
            "h-1.5 rounded-full transition-all",
            page === 0 ? "w-4 bg-white" : "w-1.5 bg-foreground/25",
          )}
        />
        <span
          className={cn(
            "h-1.5 rounded-full transition-all",
            page === 1 ? "w-4 bg-foreground/70" : "w-1.5 bg-white/35",
          )}
        />
      </div>
    </div>
  );
}
