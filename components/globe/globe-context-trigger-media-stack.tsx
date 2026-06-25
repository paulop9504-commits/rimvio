"use client";

import { GlobeContextTriggerMediaThumb } from "@/components/globe/globe-context-trigger-media-thumb";
import type { GlobeContextTriggerMediaPreview } from "@/lib/globe/context-triggers/globe-context-trigger-types";
import { cn } from "@/lib/utils";

export function GlobeContextTriggerMediaStack({
  media,
  emoji,
  className,
}: {
  media?: readonly GlobeContextTriggerMediaPreview[];
  emoji: string;
  className?: string;
}) {
  const previews = media?.filter(Boolean).slice(0, 3) ?? [];
  if (previews.length === 0) {
    return (
      <span className={cn("text-[1.35rem] leading-none", className)} aria-hidden>
        {emoji}
      </span>
    );
  }

  return (
    <div
      className={cn("flex items-center", className)}
      data-globe-context-trigger-media-stack
    >
      {previews.map((row, index) => (
        <GlobeContextTriggerMediaThumb
          key={row.id}
          media={row}
          className={cn(
            index > 0 && "-ml-2.5",
            index === 0 && "z-30",
            index === 1 && "z-20",
            index === 2 && "z-10",
          )}
        />
      ))}
    </div>
  );
}
