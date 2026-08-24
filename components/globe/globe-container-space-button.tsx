"use client";

import { PanelLeft } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeContainerSpaceButtonProps = {
  open?: boolean;
  onPress: () => void;
  liveCount?: number;
  className?: string;
};

/** Left-top — opens container space sidebar (above 내/밖 지구 toggle). */
export function GlobeContainerSpaceButton({
  open = false,
  onPress,
  liveCount = 0,
  className,
}: GlobeContainerSpaceButtonProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={copy.globe.containerSpaceOpenAria}
      aria-expanded={open}
      data-globe-container-space-trigger
      data-live-work-count={liveCount > 0 ? String(liveCount) : undefined}
      className={cn(
        "relative flex size-10 items-center justify-center rounded-full",
        "bg-[#0a0f18]/80 shadow-lg ring-1 ring-white/15 backdrop-blur-xl",
        "text-white transition-transform active:scale-[0.96]",
        open && "ring-white/30",
        className,
      )}
    >
      <PanelLeft className="size-[18px]" aria-hidden strokeWidth={2.25} />
      {liveCount > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-emerald-400 text-[9px] font-bold text-[#0a0f18]">
          {liveCount > 9 ? "9+" : liveCount}
        </span>
      ) : null}
    </button>
  );
}
