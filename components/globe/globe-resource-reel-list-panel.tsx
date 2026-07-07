"use client";

import { X } from "lucide-react";
import type { GlobeResourceReelItem } from "@/lib/globe/resource-reel/types";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeResourceReelListPanelProps = {
  areaLabel: string;
  items: readonly GlobeResourceReelItem[];
  activeResourceId?: string | null;
  onItemPress: (item: GlobeResourceReelItem) => void;
  onDismiss: () => void;
  className?: string;
};

function formatRating(score100: number): string {
  const stars = Math.min(5, Math.max(3.8, score100 / 20));
  return `★ ${stars.toFixed(2)}`;
}

export function GlobeResourceReelListPanel({
  areaLabel,
  items,
  activeResourceId = null,
  onItemPress,
  onDismiss,
  className,
}: GlobeResourceReelListPanelProps) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-x-0 z-[30]", className)}
      style={{
        bottom: "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 0.35rem)",
      }}
      data-globe-resource-reel-list-panel
    >
      <div className="pointer-events-auto mx-3 overflow-hidden rounded-[1.2rem] bg-white/96 shadow-[0_10px_36px_rgba(0,0,0,0.14)] ring-1 ring-black/[0.06] backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 border-b border-black/[0.05] px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-[#222]">{areaLabel}</p>
            <p className="truncate text-[12px] text-[#717171]">
              {copy.globe.resourceReelFoundLabel(items.length)} ·{" "}
              {copy.globe.resourceReelListSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f4f4f5] text-[#717171] active:scale-95"
            aria-label={copy.globe.resourceReelCloseAria}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="flex gap-2.5 overflow-x-auto overscroll-contain px-3 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => {
            const active = item.resourceId === activeResourceId;
            return (
              <button
                key={item.resourceId}
                type="button"
                onClick={() => onItemPress(item)}
                className={cn(
                  "w-[9.5rem] shrink-0 overflow-hidden rounded-[0.95rem] bg-white text-left ring-1 active:scale-[0.99]",
                  active
                    ? "ring-[#222] shadow-md"
                    : "ring-black/[0.08] shadow-sm",
                )}
                data-globe-resource-reel-list-card={item.resourceId}
              >
                <div className="relative aspect-[4/3] bg-[#f4f4f5]">
                  {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-[11px] text-[#86868b]">
                      {item.kind === "lodging" ? "숙" : "맛"}
                    </div>
                  )}
                  {item.secondaryLine ? (
                    <span className="absolute bottom-1.5 left-1.5 rounded-md bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-[#222] shadow-sm">
                      {item.secondaryLine}
                    </span>
                  ) : null}
                </div>
                <div className="space-y-0.5 px-2 py-2">
                  <div className="flex items-start justify-between gap-1">
                    <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-[#222]">
                      {item.title}
                    </p>
                    <span className="shrink-0 text-[10px] font-medium text-[#222]">
                      {formatRating(item.score100)}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-[10px] leading-snug text-[#717171]">
                    {item.detailReasonLine}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
