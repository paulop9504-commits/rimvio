"use client";

import { useRef } from "react";
import { GlobeContextTriggerCard } from "@/components/globe/globe-context-trigger-card";
import { copy } from "@/lib/copy/human-ko";
import type { GlobeContextTrigger } from "@/lib/globe/context-triggers/globe-context-trigger-types";
import { RIMVIO_TYPE } from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

export type GlobeContextTriggerRailProps = {
  triggers: readonly GlobeContextTrigger[];
  focusedId?: string | null;
  onTriggerPress: (trigger: GlobeContextTrigger) => void;
  /** light = ask sheet · dark = map dock */
  tone?: "light" | "dark";
  /** dock = pinned strip above composer · inline = in scroll body */
  layout?: "inline" | "dock";
  className?: string;
};

export function GlobeContextTriggerRail({
  triggers,
  focusedId = null,
  onTriggerPress,
  tone = "dark",
  layout = "inline",
  className,
}: GlobeContextTriggerRailProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  if (triggers.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "w-full",
        layout === "dock" && "border-t border-black/[0.05] bg-[#f4f5f7]/95 pt-3 backdrop-blur-md",
        className,
      )}
      data-globe-context-trigger-rail
      data-globe-context-trigger-rail-layout={layout}
    >
      <p
        className={cn(
          "mb-2",
          layout === "dock" ? "px-4" : "px-0.5",
          RIMVIO_TYPE.caption,
          tone === "light" ? "text-[#8b95a1]" : "text-white/75",
        )}
      >
        {copy.globe.contextTriggerEyebrow}
      </p>
      <div
        ref={scrollerRef}
        className={cn(
          "flex gap-2.5 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          layout === "dock" ? "snap-x snap-mandatory px-4" : "",
        )}
      >
        {triggers.map((trigger) => (
          <GlobeContextTriggerCard
            key={trigger.id}
            emoji={trigger.emoji}
            title={trigger.title}
            body={trigger.body}
            ctaLabel={trigger.ctaLabel}
            mediaPreviews={trigger.mediaPreviews}
            focused={focusedId ? trigger.id === focusedId : Boolean(trigger.focused)}
            onPress={() => onTriggerPress(trigger)}
          />
        ))}
      </div>
    </div>
  );
}
