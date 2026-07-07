"use client";

import { GlobeTypewriterText } from "@/components/globe/globe-typewriter-text";
import type { ContextAgentComposeTurn } from "@/lib/globe/assistant";
import {
  rimvioAssistantAiBubbleClass,
  rimvioAssistantMetaClass,
  rimvioAssistantTypewriterCursorClass,
  rimvioAssistantUserBubbleClass,
} from "@/lib/design/globe-assistant-surface";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeAssistantComposeThreadProps = {
  turns: readonly ContextAgentComposeTurn[];
  className?: string;
  typewriterTurnId?: string | null;
  onTypewriterComplete?: () => void;
};

/** Cursor-style thread — talk left, globe-apply right as diff line. */
export function GlobeAssistantComposeThread({
  turns,
  className,
  typewriterTurnId = null,
  onTypewriterComplete,
}: GlobeAssistantComposeThreadProps) {
  if (turns.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("space-y-2", className)}
      data-globe-assistant-compose-thread
    >
      {turns.map((turn) => {
        if (turn.role === "user") {
          return (
            <div key={turn.id} className="flex justify-end">
              <p className={rimvioAssistantUserBubbleClass("max-w-[88%] text-[13px]")}>
                {turn.text}
              </p>
            </div>
          );
        }

        if (turn.kind === "build_log") {
          return (
            <div key={turn.id} className="flex justify-start">
              <p
                className="max-w-[88%] font-mono text-[11px] leading-relaxed text-[#515154]"
                data-globe-assistant-build-log
              >
                <span className="text-[#0071e3]">&gt;</span> {turn.text}
              </p>
            </div>
          );
        }

        if (turn.kind === "globe_apply") {
          return (
            <div key={turn.id} className="flex justify-start">
              <p
                className={cn(
                  rimvioAssistantMetaClass(
                    "max-w-[88%] rounded-full bg-[#0071e3]/10 px-2.5 py-1 text-[11px] font-medium text-[#0071e3]",
                  ),
                )}
                data-globe-assistant-globe-apply
              >
                {copy.globe.globeComposeGlobeApplyPrefix} {turn.text}
              </p>
            </div>
          );
        }

        const useTypewriter = typewriterTurnId === turn.id;
        return (
          <div key={turn.id} className="flex justify-start">
            <p className={rimvioAssistantAiBubbleClass("max-w-[88%] text-[13px]")}>
              {useTypewriter ? (
                <GlobeTypewriterText
                  text={turn.text}
                  cps={46}
                  onComplete={onTypewriterComplete}
                  cursorClassName={rimvioAssistantTypewriterCursorClass()}
                />
              ) : (
                turn.text
              )}
            </p>
          </div>
        );
      })}
    </div>
  );
}
