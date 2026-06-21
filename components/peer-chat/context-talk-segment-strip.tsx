"use client";

import { MapPin } from "lucide-react";
import type { ContextTalkSegment } from "@/lib/experience-window/project-context-talk-segments";
import { copy } from "@/lib/copy/human-ko";
import { RIMVIO_RADIUS, RIMVIO_TYPE } from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

export type ContextTalkSegmentStripProps = {
  segment: ContextTalkSegment | null;
  className?: string;
};

/** Floating context chip — date · place while scrolling talk. */
export function ContextTalkSegmentStrip({
  segment,
  className,
}: ContextTalkSegmentStripProps) {
  if (!segment) {
    return null;
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center px-4 pt-2",
        className,
      )}
    >
      <div
        className={cn(
          "max-w-full border border-white/60 bg-white/90 px-3.5 py-2 shadow-sm backdrop-blur-md",
          RIMVIO_RADIUS.pill,
        )}
        data-context-talk-segment-strip
      >
        <p className={cn("truncate text-center", RIMVIO_TYPE.caption, "text-foreground/90")}>
          {segment.label}
        </p>
        {segment.placeLabel?.trim() ? (
          <p className="mt-0.5 flex items-center justify-center gap-1 truncate text-[11px] font-medium text-muted-foreground">
            <MapPin className="size-3 shrink-0" aria-hidden />
            {segment.placeLabel}
          </p>
        ) : null}
        <p className="sr-only">{copy.globe.contextTalkScrollHint}</p>
      </div>
    </div>
  );
}
