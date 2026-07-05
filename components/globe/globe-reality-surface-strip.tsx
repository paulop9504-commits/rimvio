"use client";

import { Route } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import type { RealitySurfaceProjectionBundle } from "@/lib/reality-surface";
import { cn } from "@/lib/utils";

export type GlobeRealitySurfaceStripProps = {
  projection: RealitySurfaceProjectionBundle | null;
  className?: string;
};

function legTone(index: number, activeLegIndex: number): string {
  if (index < activeLegIndex) {
    return "text-[#8b95a1] line-through decoration-[#c4cad3]";
  }
  if (index === activeLegIndex) {
    return "text-[#191f28] font-semibold";
  }
  return "text-[#6b7684]";
}

/** Bridge path + runtime phase — Reality Surface projection only (no Blueprint). */
export function GlobeRealitySurfaceStrip({
  projection,
  className,
}: GlobeRealitySurfaceStripProps) {
  if (!projection?.context) {
    return null;
  }

  const pathLabels = projection.bridge?.pathLabels ?? [];
  const activeLegIndex = projection.bridge?.activeLegIndex ?? 0;
  const phaseLabel = projection.runtime?.activePhaseLabel;
  const nextHint = projection.flow?.nextStepHintKo;

  return (
    <div
      className={cn(
        "pointer-events-auto w-full max-w-[22rem]",
        className,
      )}
      data-globe-reality-surface
    >
      <div className="rounded-[1.05rem] bg-white/94 px-3.5 py-2.5 shadow-[0_8px_28px_rgba(2,32,71,0.14)] ring-1 ring-black/[0.06] backdrop-blur-xl">
        <div className="flex items-start gap-2">
          <Route className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3182f6]" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[#8b95a1]">
              {copy.globe.realitySurface.eyebrow}
            </p>
            <p className="mt-0.5 truncate text-[13px] font-semibold text-[#191f28]">
              {projection.context.goalKo}
            </p>
            {pathLabels.length > 0 ? (
              <p className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[12px] leading-snug">
                {pathLabels.map((label, index) => (
                  <span key={`${label}-${index}`} className="inline-flex items-center">
                    <span className={legTone(index, activeLegIndex)}>{label}</span>
                    {index < pathLabels.length - 1 ? (
                      <span className="mx-0.5 text-[#c4cad3]" aria-hidden>
                        →
                      </span>
                    ) : null}
                  </span>
                ))}
              </p>
            ) : null}
            {phaseLabel ? (
              <p className="mt-1.5 text-[12px] text-[#4e5968]">
                {copy.globe.realitySurface.phaseActive(phaseLabel)}
              </p>
            ) : null}
            {nextHint ? (
              <p className="mt-1 text-[12px] text-[#3182f6]">
                {copy.globe.realitySurface.nextStep} · {nextHint}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
