"use client";

import { rimvioAssistantAiBubbleClass } from "@/lib/design/globe-assistant-surface";
import type { ContextAgentInterpretation } from "@/lib/globe/context-agent/context-agent-interpretation-store";
import { cn } from "@/lib/utils";

export type GlobeContextAgentInterpretationPanelProps = {
  interpretation: ContextAgentInterpretation | null;
  className?: string;
};

/** Messy-input interpretation — one understanding line only. */
export function GlobeContextAgentInterpretationPanel({
  interpretation,
  className,
}: GlobeContextAgentInterpretationPanelProps) {
  if (!interpretation) {
    return null;
  }

  const line = interpretation.understandingKo.trim();
  if (!line) {
    return null;
  }

  return (
    <p
      className={cn(
        rimvioAssistantAiBubbleClass("max-w-none text-[13px]"),
        className,
      )}
      data-globe-context-agent-interpretation
    >
      {line}
    </p>
  );
}
