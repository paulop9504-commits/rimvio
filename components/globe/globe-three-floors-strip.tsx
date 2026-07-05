"use client";

import type { GlobeThreeFloorsStage, RimvioUxSurfaceMode } from "@/lib/globe/resolve-globe-three-floors-stage";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeThreeFloorsStripProps = {
  stage: GlobeThreeFloorsStage;
  surfaceMode?: RimvioUxSurfaceMode;
  closureLine?: string | null;
  className?: string;
};

const STAGES: GlobeThreeFloorsStage[] = ["replay", "context", "action"];

export function GlobeThreeFloorsStrip({
  stage,
  surfaceMode = "globe",
  closureLine,
  className,
}: GlobeThreeFloorsStripProps) {
  const labels = copy.globe.threeFloors;

  return (
    <div
      className={cn("flex w-full flex-col items-center gap-1.5", className)}
      data-globe-three-floors-strip
      data-globe-three-floors-stage={stage}
      data-rimvio-ux-surface={surfaceMode}
      role="status"
      aria-live="polite"
    >
      <div className="inline-flex items-center gap-1 rounded-full bg-[#121316]/78 px-1 py-1 ring-1 ring-white/12 backdrop-blur-xl">
        {STAGES.map((key) => {
          const active = key === stage;
          return (
            <span
              key={key}
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-tight transition-colors",
                active
                  ? "bg-white/16 text-white shadow-[0_2px_8px_rgba(0,0,0,0.22)]"
                  : "text-white/42",
              )}
              data-globe-three-floors-step={key}
            >
              {labels.steps[key]}
            </span>
          );
        })}
        <span
          className={cn(
            "ml-0.5 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em]",
            surfaceMode === "field"
              ? "bg-[#0071e3]/24 text-[#8fd1ff]"
              : "bg-white/8 text-white/55",
          )}
          data-rimvio-ux-surface-badge
        >
          {surfaceMode === "field" ? labels.surfaceField : labels.surfaceGlobe}
        </span>
      </div>
      {stage === "context" && closureLine ? (
        <p className="max-w-[min(100%,18rem)] text-center text-[11px] font-medium leading-snug text-white/82 drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)]">
          {closureLine}
        </p>
      ) : null}
    </div>
  );
}
