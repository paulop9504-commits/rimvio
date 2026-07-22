"use client";

import { copy } from "@/lib/copy/human-ko";
import type { ContextAssistantWorkChip } from "@/lib/globe/assistant/build-context-assistant-work-chips";
import { cn } from "@/lib/utils";

export type GlobeContextAssistantWorkChipsProps = {
  chips: readonly ContextAssistantWorkChip[];
  className?: string;
};

/** Single horizontal chip row under Context AI header — WIP tools/actions only. */
export function GlobeContextAssistantWorkChips({
  chips,
  className,
}: GlobeContextAssistantWorkChipsProps) {
  if (chips.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex gap-1.5 overflow-x-auto border-b border-black/[0.05] px-3 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      role="list"
      aria-label={copy.globe.contextAssistantWorkChipsAria}
      data-globe-context-assistant-work-chips
    >
      {chips.map((chip) => (
        <span
          key={chip.id}
          role="listitem"
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-tight",
            chip.status === "success" &&
              "bg-[#f5f5f7] text-[#3a3a3c] ring-1 ring-black/[0.04]",
            chip.status === "pending" &&
              "bg-[#fff4e5] text-[#b25e09] ring-1 ring-[#ffd9a8]/70",
            chip.status === "failed" &&
              "bg-[#fff2f1] text-[#c0392b] ring-1 ring-[#ffc9c4]/70",
          )}
          data-work-chip-status={chip.status}
        >
          <span
            className={cn(
              "size-1 shrink-0 rounded-full",
              chip.status === "success" && "bg-[#34c759]",
              chip.status === "pending" && "bg-[#ff9500]",
              chip.status === "failed" && "bg-[#ff3b30]",
            )}
            aria-hidden
          />
          {chip.labelKo}
        </span>
      ))}
    </div>
  );
}
