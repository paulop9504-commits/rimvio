"use client";

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
};

/** Small line above globe composer — not bottom toast. */
export function GlobeComposerHintStrip({
  text,
  tone = "neutral",
  mapDark = false,
  lightPill = false,
  className,
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
      <p
        className={cn(
          "max-w-[min(100%,20rem)] text-center text-[11px] font-medium leading-snug line-clamp-2 rounded-full px-2.5 py-1",
          lightPill
            ? tone === "error"
              ? "bg-[#fee2e2]/95 text-[#b91c1c] ring-1 ring-[#fecaca]"
              : tone === "success"
                ? "bg-[#ecfdf3]/95 text-[#15803d] ring-1 ring-[#bbf7d0]"
                : "bg-white/92 text-[#6b7684] ring-1 ring-black/[0.06]"
            : mapDark
              ? tone === "error"
                ? "bg-[#3f1515]/88 text-[#fca5a5] ring-1 ring-[#ef4444]/25"
                : tone === "success"
                  ? "bg-[#0f2918]/88 text-[#86efac] ring-1 ring-[#22c55e]/25"
                  : "bg-[#121316]/78 text-white/72 ring-1 ring-white/12"
              : tone === "error"
                ? "bg-[#fee2e2] text-[#b91c1c]"
                : tone === "success"
                  ? "bg-[#ecfdf3] text-[#15803d]"
                  : "bg-white/90 text-[#6b7684] ring-1 ring-black/[0.05]",
        )}
      >
        {text}
      </p>
    </div>
  );
}
