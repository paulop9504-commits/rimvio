"use client";

import { Sparkles } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeContextAgentMapButtonProps = {
  arming?: boolean;
  onPress: () => void;
  className?: string;
};

/** Globe map — arm context assistant, then tap a context pin to bind. */
export function GlobeContextAgentMapButton({
  arming = false,
  onPress,
  className,
}: GlobeContextAgentMapButtonProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={copy.globe.contextAgentMapButtonAria}
      aria-pressed={arming}
      data-globe-context-agent-map-trigger
      data-globe-context-agent-arming={arming ? "true" : "false"}
      className={cn(
        "flex size-10 items-center justify-center rounded-full shadow-lg ring-1 backdrop-blur-xl transition-transform active:scale-[0.96]",
        arming
          ? "bg-[#0071e3]/90 text-white ring-[#0071e3]/50"
          : "bg-[#0a0f18]/80 text-[#9fd0ff] ring-white/15",
        className,
      )}
    >
      <Sparkles className="size-[18px]" aria-hidden strokeWidth={2.25} />
    </button>
  );
}
