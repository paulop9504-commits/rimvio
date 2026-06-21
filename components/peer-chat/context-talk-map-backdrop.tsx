"use client";

import { memo } from "react";
import { GlobeVectorMapStage } from "@/components/globe/globe-vector-map-stage";
import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import type { GlobeVectorMapView } from "@/lib/globe/globe-vector-map-view";
import { cn } from "@/lib/utils";

export type ContextTalkMapBackdropProps = {
  view: GlobeVectorMapView | null;
  pins?: readonly ClassifiedGlobePin[];
  className?: string;
};

/** Context Talk — soft map layer behind conversation (Rimvio muted, non-interactive). */
export const ContextTalkMapBackdrop = memo(function ContextTalkMapBackdrop({
  view,
  pins = [],
  className,
}: ContextTalkMapBackdropProps) {
  if (!view) {
    return (
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-b from-muted/80 via-muted/60 to-background",
          className,
        )}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      data-context-talk-map
      aria-hidden
    >
      <GlobeVectorMapStage
        view={view}
        pins={pins}
        active
        interactive={false}
        className="size-full scale-[1.04] opacity-[0.42] saturate-[0.88]"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/55 via-background/72 to-background/94" />
      <div className="absolute inset-0 backdrop-blur-[1.5px]" />
    </div>
  );
});
