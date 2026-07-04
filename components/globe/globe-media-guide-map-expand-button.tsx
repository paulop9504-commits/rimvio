"use client";

import { MapPinned } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeMediaGuideMapExpandButtonProps = {
  onClick: () => void;
  candidateCount?: number;
  label?: string;
  variant?: "pill" | "overlay" | "bar";
  className?: string;
};

export function GlobeMediaGuideMapExpandButton({
  onClick,
  candidateCount,
  label = copy.globe.contextGuideExpandMap,
  variant = "pill",
  className,
}: GlobeMediaGuideMapExpandButtonProps) {
  const countBadge =
    candidateCount != null && candidateCount > 0
      ? copy.globe.contextGuideCandidateCount(candidateCount)
      : null;

  if (variant === "overlay") {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
        className={cn(
          "inline-flex w-full items-center justify-center gap-1 rounded-[0.65rem] bg-black/62 px-2 py-1.5 text-[10px] font-semibold text-white backdrop-blur-md ring-1 ring-white/16 active:scale-[0.98]",
          className,
        )}
        data-globe-media-guide-expand-map
      >
        <MapPinned className="size-3 shrink-0" aria-hidden />
        <span>{label}</span>
        {countBadge ? (
          <span className="rounded-full bg-white/14 px-1.5 py-0.5 text-[9px] font-medium text-white/82">
            {countBadge}
          </span>
        ) : null}
      </button>
    );
  }

  if (variant === "bar") {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
        className={cn(
          "flex w-full items-center justify-center gap-1.5 rounded-[0.85rem] bg-[#0071e3] px-3 py-2.5 text-[12px] font-semibold text-white shadow-[0_8px_20px_rgba(0,113,227,0.28)] active:scale-[0.98]",
          className,
        )}
        data-globe-media-guide-expand-map
      >
        <MapPinned className="size-3.5 shrink-0" aria-hidden />
        <span>{label}</span>
        {countBadge ? <span className="text-[11px] text-white/82">{countBadge}</span> : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 active:scale-[0.98]",
        "bg-[#eef5ff] text-[#1d4ed8] ring-[#3182f6]/12",
        className,
      )}
      data-globe-media-guide-expand-map
    >
      <MapPinned className="size-3 shrink-0" aria-hidden />
      <span>{label}</span>
      {countBadge ? (
        <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[9px] font-medium text-[#1d4ed8]">
          {countBadge}
        </span>
      ) : null}
    </button>
  );
}
