"use client";

import { X } from "lucide-react";
import type { MediaSpatialTraceTourStop } from "@/lib/situation-projection/build-media-spatial-trace-tour";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeSpatialTraceTourChipProps = {
  stop: MediaSpatialTraceTourStop;
  stopIndex: number;
  stopCount: number;
  onSkip: () => void;
  className?: string;
};

export function GlobeSpatialTraceTourChip({
  stop,
  stopIndex,
  stopCount,
  onSkip,
  className,
}: GlobeSpatialTraceTourChipProps) {
  const meta = [stop.inferenceLabelKo, stop.confidenceLabelKo]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className={cn(
        "pointer-events-auto absolute inset-x-3 z-[26] mx-auto max-w-[min(100%,22rem)] rounded-[1.15rem] border border-white/14 bg-[#0b1220]/90 px-3.5 py-3 text-white shadow-[0_18px_44px_rgba(0,0,0,0.34)] backdrop-blur-xl",
        className,
      )}
      data-globe-spatial-trace-tour-chip
      data-globe-spatial-trace-tour-kind={stop.kind}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/52">
            {copy.globe.spatialTraceTourEyebrow}
            {stopCount > 1 ? (
              <span className="ml-1.5 text-white/42">
                {copy.globe.spatialTraceTourProgress(stopIndex + 1, stopCount)}
              </span>
            ) : null}
          </p>
          <p className="mt-1 line-clamp-2 text-[14px] font-semibold leading-snug">
            {stop.labelKo}
          </p>
          {stop.detailKo ? (
            <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-white/72">
              {stop.detailKo}
            </p>
          ) : null}
          {meta ? (
            <p className="mt-1.5 text-[10px] font-medium text-[#8fd1ff]">{meta}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="shrink-0 rounded-full bg-white/10 p-1.5 text-white/72 active:scale-[0.97]"
          aria-label={copy.globe.spatialTraceTourSkip}
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
