"use client";

import { PanelLeft } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeContainerSpaceButtonProps = {
  open?: boolean;
  onPress: () => void;
  className?: string;
};

/** Left-top — opens container space sidebar (above 내/밖 지구 toggle). */
export function GlobeContainerSpaceButton({
  open = false,
  onPress,
  className,
}: GlobeContainerSpaceButtonProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={copy.globe.containerSpaceOpenAria}
      aria-expanded={open}
      data-globe-container-space-trigger
      className={cn(
        "flex size-10 items-center justify-center rounded-full",
        "bg-[#0a0f18]/80 shadow-lg ring-1 ring-white/15 backdrop-blur-xl",
        "text-white transition-transform active:scale-[0.96]",
        open && "ring-white/30",
        className,
      )}
    >
      <PanelLeft className="size-[18px]" aria-hidden strokeWidth={2.25} />
    </button>
  );
}
