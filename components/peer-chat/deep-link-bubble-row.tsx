"use client";

import type { DeepLinkBubbleCandidate } from "@/lib/peer-chat/ai-lens/types";
import { cn } from "@/lib/utils";

type DeepLinkBubbleRowProps = {
  candidates: readonly DeepLinkBubbleCandidate[];
  onSelect: (candidate: DeepLinkBubbleCandidate) => void;
  disabled?: boolean;
  className?: string;
};

/** Suggest-only action bubbles — tap to execute (never auto). */
export function DeepLinkBubbleRow({
  candidates,
  onSelect,
  disabled = false,
  className,
}: DeepLinkBubbleRowProps) {
  if (candidates.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("flex flex-wrap gap-1.5", className)}
      role="group"
      aria-label="AI Lens 제안"
    >
      {candidates.map((candidate) => (
        <button
          key={candidate.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(candidate)}
          title={candidate.reason}
          className={cn(
            "rounded-full border px-2.5 py-1 text-[11px] font-medium leading-tight transition-colors",
            "border-rimvio-neon-purple/35 bg-rimvio-neon-purple/12 text-[#e8e0ff]",
            "hover:bg-rimvio-neon-purple/22 active:scale-[0.98]",
            "disabled:opacity-40",
          )}
        >
          {candidate.label}
        </button>
      ))}
    </div>
  );
}
