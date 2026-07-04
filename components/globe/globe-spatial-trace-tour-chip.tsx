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
        "pointer-events-auto absolute inset-x-3 z-[26] mx-auto max-w-[min(100%,22rem)] rounded-[1.15rem] border border-white/80 bg-white/90 px-3.5 py-3 text-slate-900 shadow-[0_12px_36px_rgba(15,23,42,0.12)] backdrop-blur-xl ring-1 ring-black/[0.04]",
        className,
      )}
      data-globe-spatial-trace-tour-chip
      data-globe-spatial-trace-tour-kind={stop.kind}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-700/80">
            {copy.globe.spatialTraceTourEyebrow}
            {stopCount > 1 ? (
              <span className="ml-1.5 text-sky-600/70">
                {copy.globe.spatialTraceTourProgress(stopIndex + 1, stopCount)}
              </span>
            ) : null}
          </p>
          <p className="mt-1 line-clamp-2 text-[14px] font-semibold leading-snug text-slate-900">
            {stop.labelKo}
          </p>
          {stop.detailKo ? (
            <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-slate-600">
              {stop.detailKo}
            </p>
          ) : null}
          {meta ? (
            <p className="mt-1.5 text-[10px] font-medium text-sky-700">{meta}</p>
          ) : null}
        </div>
        <button
          type="button"
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
            onSkip();
          }}
          className="shrink-0 rounded-full bg-slate-100 p-1.5 text-slate-600 active:scale-[0.97]"
          aria-label={copy.globe.spatialTraceTourSkip}
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
