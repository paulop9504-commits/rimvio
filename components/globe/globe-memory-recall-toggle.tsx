"use client";

import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeMemoryRecallToggleProps = {
  open: boolean;
  onToggle: () => void;
  className?: string;
};

/** Peek handle — opens 그때 거기 recall above compose without blocking the map. */
export function GlobeMemoryRecallToggle({
  open,
  onToggle,
  className,
}: GlobeMemoryRecallToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-white/92 px-3 py-1.5",
        "text-[12px] font-semibold text-[#4e5968]",
        "shadow-[0_4px_16px_rgba(2,32,71,0.1)] ring-1 ring-black/[0.06] backdrop-blur-xl",
        "transition-colors active:bg-white",
        className,
      )}
      aria-expanded={open}
      aria-label={open ? copy.globe.memoryRecallToggleCollapse : copy.globe.memoryRecallToggleExpand}
      data-globe-memory-recall-toggle
    >
      <Sparkles className="size-3.5 shrink-0 text-[#3182f6]" aria-hidden />
      <span>{copy.globe.memoryRecallEyebrow}</span>
      {open ? (
        <ChevronDown className="size-3.5 shrink-0 text-[#8b95a1]" aria-hidden />
      ) : (
        <ChevronUp className="size-3.5 shrink-0 text-[#8b95a1]" aria-hidden />
      )}
    </button>
  );
}
