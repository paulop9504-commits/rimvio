"use client";

import { GlobeTypewriterText } from "@/components/globe/globe-typewriter-text";
import {
  rimvioAssistantAiBubbleMutedClass,
  rimvioAssistantTypewriterCursorClass,
} from "@/lib/design/globe-assistant-surface";
import { cn } from "@/lib/utils";

export type GlobeContextAgentPreflightBubbleProps = {
  briefingLine: string;
  className?: string;
  onRevealComplete?: () => void;
};

/** Empty chat — assistant speaks first (Cursor-style plain bubble). */
export function GlobeContextAgentPreflightBubble({
  briefingLine,
  className,
  onRevealComplete,
}: GlobeContextAgentPreflightBubbleProps) {
  const line = briefingLine.trim();

  if (!line) {
    return null;
  }

  return (
    <div
      className={cn(rimvioAssistantAiBubbleMutedClass("max-w-none text-[13px]"), className)}
      data-globe-context-agent-preflight
    >
      <GlobeTypewriterText
        text={line}
        cps={46}
        onComplete={onRevealComplete}
        cursorClassName={rimvioAssistantTypewriterCursorClass()}
      />
    </div>
  );
}
