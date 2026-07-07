"use client";

import { GlobeTypewriterText } from "@/components/globe/globe-typewriter-text";
import { rimvioAssistantHintClass } from "@/lib/design/globe-assistant-surface";
import { cn } from "@/lib/utils";
import type { ComposerHintTone } from "@/hooks/use-composer-hint";

export type GlobeComposerHintStripProps = {
  text: string | null;
  tone?: ComposerHintTone;
  /** Dark frosted map prompt over globe */
  mapDark?: boolean;
  /** Light pill on map */
  lightPill?: boolean;
  className?: string;
  /** Progressive reveal for assistant understanding lines. */
  typewriter?: boolean;
};

/** Small line above globe composer — not bottom toast. */
export function GlobeComposerHintStrip({
  text,
  tone = "neutral",
  mapDark = false,
  lightPill = false,
  className,
  typewriter = true,
}: GlobeComposerHintStripProps) {
  if (!text?.trim()) {
    return null;
  }

  return (
    <div
      className={cn("flex w-full justify-center px-1", className)}
      data-globe-composer-hint
      role="status"
      aria-live="polite"
    >
      <p className={rimvioAssistantHintClass(tone, { mapDark, lightPill })}>
        {typewriter && tone !== "error" ? (
          <GlobeTypewriterText text={text} cps={tone === "success" ? 48 : 52} />
        ) : (
          text
        )}
      </p>
    </div>
  );
}
