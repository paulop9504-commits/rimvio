"use client";

import { copy } from "@/lib/copy/human-ko";
import type { ContextAgentProcessPhase } from "@/lib/globe/context-agent/context-agent-runtime-state";
import { cn } from "@/lib/utils";

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
  /** Overrides phase label when set (auto-run / intake progress). */
  statusHintKo?: string | null;
  visible?: boolean;
  className?: string;
};

/** Cursor-style — single active status line while working. */
export function GlobeContextAgentProcessStrip({
  activePhase,
  statusHintKo = null,
  visible = true,
  className,
}: GlobeContextAgentProcessStripProps) {
  const hint = statusHintKo?.trim() || null;
  const label =
    hint ??
    (activePhase ? phaseLabel(activePhase) : copy.globe.contextAgentStatusBusy);

  if (!visible || (!activePhase && !hint)) {
    return null;
  }

  return (
    <p
      className={cn(
        "flex items-center gap-1.5 text-[11px] font-medium text-[#86868b]",
        className,
      )}
      data-globe-context-agent-process
      data-globe-context-agent-process-phase={activePhase ?? "busy"}
    >
      <span
        className="size-1.5 shrink-0 animate-pulse rounded-full bg-[#0071e3]/70"
        aria-hidden
      />
      <span>{label}</span>
    </p>
  );
}
