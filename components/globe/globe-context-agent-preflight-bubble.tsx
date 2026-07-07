"use client";

import { GlobeContextConditionOrb } from "@/components/globe/globe-context-condition-orb";
import { GlobeTypewriterText } from "@/components/globe/globe-typewriter-text";
import {
  rimvioAssistantBodyClass,
  rimvioAssistantEyebrowClass,
  rimvioAssistantSpeechBubbleClass,
  rimvioAssistantTypewriterCursorClass,
} from "@/lib/design/globe-assistant-surface";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeContextAgentPreflightBubbleProps = {
  briefingLine: string;
  className?: string;
  onRevealComplete?: () => void;
};

/** Empty chat — assistant speaks first with dot briefing. */
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
      className={cn("flex items-start gap-2", className)}
      data-globe-context-agent-preflight
    >
      <GlobeContextConditionOrb size="sm" className="mt-0.5 shrink-0" />
      <div className={cn("min-w-0 flex-1", rimvioAssistantSpeechBubbleClass())}>
        <p className={rimvioAssistantEyebrowClass()}>
          {copy.globe.contextAgentPreflightEyebrow}
        </p>
        <p className={cn("mt-1", rimvioAssistantBodyClass())}>
          <GlobeTypewriterText
            text={line}
            cps={46}
            onComplete={onRevealComplete}
            cursorClassName={rimvioAssistantTypewriterCursorClass()}
          />
        </p>
      </div>
    </div>
  );
}
