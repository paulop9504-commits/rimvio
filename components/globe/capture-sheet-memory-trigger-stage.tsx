"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GlobeContextTriggerRecallCard } from "@/components/globe/globe-context-trigger-recall-card";
import type { GlobeContextTrigger } from "@/lib/globe/context-triggers/globe-context-trigger-types";
import { cn } from "@/lib/utils";

export type CaptureSheetMemoryTriggerStageProps = {
  triggers: readonly GlobeContextTrigger[];
  onTriggerPress: (trigger: GlobeContextTrigger) => void;
  compact?: boolean;
  className?: string;
};

/** Horizontal recall posters — user's photos as the pull. */
export function CaptureSheetMemoryTriggerStage({
  triggers,
  onTriggerPress,
  compact = false,
  className,
}: CaptureSheetMemoryTriggerStageProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const syncActiveFromScroll = useCallback(() => {
    const node = scrollerRef.current;
    if (!node || triggers.length === 0) {
      return;
    }
    const centerX = node.scrollLeft + node.clientWidth / 2;
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    const children = node.querySelectorAll<HTMLElement>("[data-trigger-carousel-card]");
    children.forEach((child, index) => {
      const cardCenter = child.offsetLeft + child.offsetWidth / 2;
      const distance = Math.abs(cardCenter - centerX);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    setActiveIndex(bestIndex);
  }, [triggers.length]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node || triggers.length === 0) {
      return;
    }
    const middle = Math.min(1, Math.floor(triggers.length / 2));
    const target = node.querySelectorAll<HTMLElement>("[data-trigger-carousel-card]")[middle];
    if (target) {
      node.scrollLeft = target.offsetLeft - (node.clientWidth - target.offsetWidth) / 2;
      setActiveIndex(middle);
    }
  }, [triggers]);

  if (triggers.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("flex w-full flex-col -mx-6", className)}
      data-capture-sheet-memory-trigger-stage
    >
      <div
        ref={scrollerRef}
        onScroll={syncActiveFromScroll}
        className={cn(
          "flex snap-x snap-mandatory items-end overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          compact ? "gap-2.5 px-4 py-1 pr-3" : "gap-3.5 px-6 py-2 pr-4",
        )}
        data-trigger-carousel
      >
        {triggers.map((trigger, index) => (
          <GlobeContextTriggerRecallCard
            key={trigger.id}
            trigger={trigger}
            active={index === activeIndex}
            compact={compact}
            onPress={() => {
              setActiveIndex(index);
              onTriggerPress(trigger);
            }}
          />
        ))}
      </div>
    </div>
  );
}
