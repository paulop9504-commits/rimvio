"use client";

import { GlobeContextConditionOrb } from "@/components/globe/globe-context-condition-orb";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeContextAgentPreflightBubbleProps = {
  briefingLine: string;
  className?: string;
};

/** Empty chat — assistant speaks first with dot briefing. */
export function GlobeContextAgentPreflightBubble({
  briefingLine,
  className,
}: GlobeContextAgentPreflightBubbleProps) {
  const line = briefingLine.trim();
  if (!line) {
    return null;
  }

  return (
    <div
      className={cn("flex items-start gap-2", className)}
      data-globe-context-agent-preflight
    >
      <GlobeContextConditionOrb size="sm" className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 rounded-[1rem] rounded-tl-md bg-[#f5f5f7] px-3 py-2.5 ring-1 ring-black/[0.04]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
          {copy.globe.contextAgentPreflightEyebrow}
        </p>
        <p className="mt-1 text-[13px] font-medium leading-relaxed text-[#1d1d1f]">
          {line}
        </p>
      </div>
    </div>
  );
}
