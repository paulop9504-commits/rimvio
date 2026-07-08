"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import type { GlobeResourceReelItem } from "@/lib/globe/resource-reel/types";
import {
  buildResourceReelKindFilters,
  type ResourceReelKindFilter,
} from "@/lib/globe/resource-reel/resource-reel-kind-filter";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

function kindFilterLabel(kind: ResourceReelKindFilter): string {
  switch (kind) {
    case "activity":
      return copy.globe.resourceReelFilterActivity;
    case "eatery":
      return copy.globe.resourceReelFilterEatery;
    case "lodging":
      return copy.globe.resourceReelFilterLodging;
    case "amenity":
      return copy.globe.resourceReelFilterAmenity;
    case "all":
      return copy.globe.resourceReelFilterAll;
  }
}

export type GlobeResourceReelListPanelProps = {
  areaLabel: string;
  items: readonly GlobeResourceReelItem[];
  allItems?: readonly GlobeResourceReelItem[];
  kindFilter?: ResourceReelKindFilter;
  onKindFilterChange?: (kind: ResourceReelKindFilter) => void;
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
  allItems,
  kindFilter = "all",
  onKindFilterChange,
  activeResourceId = null,
  onItemPress,
  onDismiss,
  className,
}: GlobeResourceReelListPanelProps) {
  const sourceItems = allItems ?? items;
  const kindFilters = useMemo(
    () => buildResourceReelKindFilters(sourceItems),
    [sourceItems],
  );
  const showKindFilters = kindFilters.length > 2 && onKindFilterChange;

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

        {showKindFilters ? (
          <div className="flex gap-1.5 overflow-x-auto px-3 pb-2.5 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {kindFilters.map((chip) => {
              const active = chip.id === kindFilter;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => onKindFilterChange(chip.id)}
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition active:scale-[0.98]",
                    active
                      ? "bg-[#1d1d1f] text-white"
                      : "bg-[#f5f5f7] text-[#1d1d1f] ring-1 ring-black/[0.05]",
                  )}
                  aria-pressed={active}
                  data-globe-resource-reel-kind-filter={chip.id}
                >
                  {chip.label}
                  <span
                    className={cn(
                      "ml-1 tabular-nums",
                      active ? "text-white/75" : "text-[#86868b]",
                    )}
                  >
                    {chip.count}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="flex gap-2.5 overflow-x-auto overscroll-contain px-3 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.length === 0 ? (
            <p
              className="w-full px-1 py-4 text-center text-[12px] leading-snug text-[#717171]"
              data-globe-resource-reel-filter-empty
            >
              {copy.globe.resourceReelFilterEmptyList(kindFilterLabel(kindFilter))}
            </p>
          ) : (
            items.map((item) => {
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
                        {item.kind === "lodging"
                          ? "숙"
                          : item.kind === "activity"
                            ? item.activitySubtype === "shopping"
                              ? "쇼"
                              : item.activitySubtype === "museum"
                                ? "박"
                                : item.activitySubtype === "park"
                                  ? "공"
                                  : item.activitySubtype === "nightlife"
                                    ? "야"
                                    : item.activitySubtype === "photo_spot"
                                      ? "포"
                                      : "놀"
                            : item.kind === "amenity"
                              ? "편"
                              : "맛"}
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
            })
          )}
        </div>
      </div>
    </div>
  );
}
