"use client";

import { useCallback, useRef, useState } from "react";
import { GlobeContextMediaShortsReel } from "@/components/globe/globe-context-media-shorts-reel";
import { ExperienceBridgeParticipantsStrip } from "@/components/globe/experience-bridge-participants-strip";
import { ExperienceBridgeThumbnailRail } from "@/components/globe/experience-bridge-thumbnail-rail";
import type { ContextMediaReelItem } from "@/lib/globe/project-context-media-reel";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type ExperienceBridgeMediaShellProps = {
  items: readonly ContextMediaReelItem[];
  title: string;
  place: string;
  eventId: string;
  viewerUserId?: string | null;
  deletable?: boolean;
  onMediaDeleted?: () => void;
  className?: string;
};

/** Bridge pin — cinematic media + participant strip + filmstrip. */
export function ExperienceBridgeMediaShell({
  items,
  title,
  place,
  eventId,
  viewerUserId,
  deletable = false,
  onMediaDeleted,
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

  return (
    <div
      className={cn("relative flex min-h-0 flex-1 flex-col", className)}
      data-experience-bridge-media-shell
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-2">
        <ExperienceBridgeParticipantsStrip items={items} />
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-y-contain pt-[4.5rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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

      <div className="shrink-0 space-y-2 border-t border-white/10 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-3 py-3 backdrop-blur-md">
        <ExperienceBridgeThumbnailRail
          items={items}
          activeIndex={activeIndex}
          onSelect={scrollToIndex}
        />
        <p className="text-center text-[10px] font-medium text-white/45">
          {copy.globe.bridgeMediaSwipeHint(items.length)}
        </p>
      </div>
    </div>
  );
}
