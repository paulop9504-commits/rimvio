"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GlobeContextMediaShortsReel } from "@/components/globe/globe-context-media-shorts-reel";
import { ExperienceBridgeThumbnailRail } from "@/components/globe/experience-bridge-thumbnail-rail";
import type { ContextMediaReelItem } from "@/lib/globe/project-context-media-reel";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type BridgeMediaArrivalHint = {
  count: number;
  authorName: string;
  targetIndex: number;
};

export type ExperienceBridgeMediaShellProps = {
  items: readonly ContextMediaReelItem[];
  title: string;
  place: string;
  eventId: string;
  viewerUserId?: string | null;
  deletable?: boolean;
  onMediaDeleted?: () => void;
  arrivalHint?: BridgeMediaArrivalHint | null;
  onDismissArrival?: () => void;
  className?: string;
};

/** Bridge pin — full-bleed moments + minimal filmstrip. */
export function ExperienceBridgeMediaShell({
  items,
  title,
  place,
  eventId,
  viewerUserId,
  deletable = false,
  onMediaDeleted,
  arrivalHint = null,
  onDismissArrival,
  className,
}: ExperienceBridgeMediaShellProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollToIndex = useCallback((index: number) => {
    const root = scrollRef.current;
    if (!root) {
      return;
    }
    const slide = root.querySelector<HTMLElement>(
      `[data-globe-context-shorts-slide][data-slide-index="${index}"]`,
    );
    slide?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveIndex(index);
  }, []);

  useEffect(() => {
    if (!arrivalHint) {
      return;
    }
    scrollToIndex(arrivalHint.targetIndex);
    const timer = window.setTimeout(() => onDismissArrival?.(), 4_000);
    return () => window.clearTimeout(timer);
  }, [arrivalHint, onDismissArrival, scrollToIndex]);

  return (
    <div
      className={cn("relative flex min-h-0 flex-1 flex-col bg-black", className)}
      data-experience-bridge-media-shell
    >
      {arrivalHint ? (
        <div className="pointer-events-none absolute inset-x-4 top-3 z-20 flex justify-center">
          <div className="pointer-events-auto max-w-full rounded-full bg-white/95 px-3.5 py-2 text-[#1d1d1f] shadow-lg backdrop-blur-md">
            <p className="truncate text-[12px] font-semibold">
              {copy.globe.bridgeMediaArrivalStrip(
                arrivalHint.authorName,
                arrivalHint.count,
              )}
            </p>
          </div>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={() => {
          const root = scrollRef.current;
          if (!root) {
            return;
          }
          const slides = root.querySelectorAll<HTMLElement>(
            "[data-globe-context-shorts-slide]",
          );
          const mid = root.scrollTop + root.clientHeight * 0.35;
          for (let i = 0; i < slides.length; i += 1) {
            const slide = slides[i]!;
            if (slide.offsetTop <= mid && slide.offsetTop + slide.offsetHeight > mid) {
              setActiveIndex(i);
              break;
            }
          }
        }}
      >
        <GlobeContextMediaShortsReel
          key={eventId}
          items={items}
          title={title}
          place={place}
          fillViewport
          embedded
          variant="bridge"
          eventId={eventId}
          viewerUserId={viewerUserId}
          deletable={deletable}
          onMediaDeleted={onMediaDeleted}
        />
      </div>

      {items.length > 1 ? (
        <div className="shrink-0 border-t border-white/10 bg-black/90 px-3 py-2 backdrop-blur-md">
          <ExperienceBridgeThumbnailRail
            items={items}
            activeIndex={activeIndex}
            onSelect={scrollToIndex}
            viewerUserId={viewerUserId}
            variant="dark"
          />
        </div>
      ) : null}
    </div>
  );
}
