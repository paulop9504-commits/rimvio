"use client";

import { copy } from "@/lib/copy/human-ko";
import type { ContextAgentProcessPhase } from "@/lib/globe/context-agent/context-agent-runtime-state";
import { cn } from "@/lib/utils";

const PHASES: readonly ContextAgentProcessPhase[] = [
  "exploring",
  "analyzing",
  "optimizing",
];

function phaseLabel(phase: ContextAgentProcessPhase): string {
  switch (phase) {
    case "exploring":
      return copy.globe.contextAgentStatusExplore;
    case "analyzing":
      return copy.globe.contextAgentStatusAnalyze;
    case "optimizing":
      return copy.globe.contextAgentStatusPin;
    default:
      return phase;
  }
}

export type GlobeContextAgentProcessStripProps = {
  activePhase: ContextAgentProcessPhase | null;
  visible?: boolean;
  className?: string;
};

/** Cursor-style process visibility — exploring → analyzing → optimizing. */
export function GlobeContextAgentProcessStrip({
  activePhase,
  visible = true,
  className,
}: GlobeContextAgentProcessStripProps) {
  if (!visible || !activePhase) {
    return null;
  }

  const activeIndex = PHASES.indexOf(activePhase);

  return (
    <div
      className={cn("space-y-1.5", className)}
      data-globe-context-agent-process
      data-globe-context-agent-process-phase={activePhase}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
        {copy.globe.contextAgentProcessEyebrow}
      </p>
      <ol className="flex flex-col gap-1">
        {PHASES.map((phase, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;
          return (
            <li
              key={phase}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1 text-[11px] leading-snug",
                active && "bg-[#0071e3]/10 font-medium text-[#0071e3]",
                done && "text-[#86868b]",
                !active && !done && "text-[#c7c7cc]",
              )}
              data-globe-context-agent-process-step={phase}
              data-globe-context-agent-process-step-active={active ? "true" : undefined}
            >
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                  active && "bg-[#0071e3] text-white",
                  done && "bg-[#34c759]/15 text-[#248a3d]",
                  !active && !done && "bg-black/[0.04] text-[#c7c7cc]",
                )}
                aria-hidden
              >
                {done ? "✓" : index + 1}
              </span>
              <span>{phaseLabel(phase)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
