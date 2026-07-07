"use client";

import { copy } from "@/lib/copy/human-ko";
import {
  rimvioAssistantEyebrowClass,
  rimvioAssistantProcessBadgeClass,
  rimvioAssistantProcessStepClass,
} from "@/lib/design/globe-assistant-surface";
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
      <p className={rimvioAssistantEyebrowClass("tracking-[0.06em]")}>
        {copy.globe.contextAgentProcessEyebrow}
      </p>
      <ol className="flex flex-col gap-1">
        {PHASES.map((phase, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;
          const state = done ? "done" : active ? "active" : "pending";
          return (
            <li
              key={phase}
              className={rimvioAssistantProcessStepClass(state)}
              data-globe-context-agent-process-step={phase}
              data-globe-context-agent-process-step-active={active ? "true" : undefined}
            >
              <span className={rimvioAssistantProcessBadgeClass(state)} aria-hidden>
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
