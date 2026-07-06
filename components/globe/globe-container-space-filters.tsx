"use client";

import { GlobeGpsPanel } from "@/components/globe/globe-gps-panel";
import { copy } from "@/lib/copy/human-ko";
import {
  resolveGlobeContextTimeFilterLabel,
  type GlobeContextTimeFilter,
} from "@/lib/globe/globe-context-time-filter";
import type { GlobeContextPeerOption } from "@/lib/globe/list-globe-context-peer-options";
import { cn } from "@/lib/utils";

const FILTERS: GlobeContextTimeFilter[] = ["all", "this_year", "this_month"];

export type GlobeContainerSpaceFiltersProps = {
  timeFilter: GlobeContextTimeFilter;
  onTimeFilterChange: (value: GlobeContextTimeFilter) => void;
  peopleFilter?: string | null;
  onPeopleFilterChange?: (value: string | null) => void;
  peerOptions?: readonly GlobeContextPeerOption[];
  onFlyToHere?: () => void;
  showSectionTitle?: boolean;
  className?: string;
};

/** Time · people · GPS filters — tucked in container space sidebar. */
export function GlobeContainerSpaceFilters({
  timeFilter,
  onTimeFilterChange,
  peopleFilter = null,
  onPeopleFilterChange,
  peerOptions = [],
  onFlyToHere,
  showSectionTitle = true,
  className,
}: GlobeContainerSpaceFiltersProps) {
  const hasActiveFilters = timeFilter !== "all" || Boolean(peopleFilter?.trim());

  return (
    <section
      className={cn("px-2", className)}
      data-globe-container-space-filters
      data-globe-container-space-filters-active={hasActiveFilters ? "true" : "false"}
    >
      {showSectionTitle ? (
        <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-white/40">
          {copy.globe.containerSpaceFiltersSection}
        </p>
      ) : null}

      <div className="rounded-xl bg-white/[0.04] p-2 ring-1 ring-white/8">
        <div className="flex rounded-full bg-white/[0.06] p-0.5 ring-1 ring-white/8">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => onTimeFilterChange(filter)}
              className={cn(
                "min-w-0 flex-1 rounded-full px-1 py-1 text-[10px] font-semibold transition active:scale-[0.98]",
                timeFilter === filter
                  ? "bg-[#3b82f6] text-white shadow-sm"
                  : "text-white/55",
              )}
              data-globe-container-space-time-filter={filter}
            >
              {resolveGlobeContextTimeFilterLabel(filter)}
            </button>
          ))}
        </div>

        {onPeopleFilterChange && peerOptions.length > 0 ? (
          <div className="mt-2 border-t border-white/8 pt-2" data-globe-container-space-people-filter>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => onPeopleFilterChange(null)}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold transition active:scale-[0.98]",
                  !peopleFilter
                    ? "bg-[#3b82f6] text-white shadow-sm"
                    : "bg-white/8 text-white/60",
                )}
              >
                전체
              </button>
              {peerOptions.slice(0, 8).map((peer) => (
                <button
                  key={peer.displayName}
                  type="button"
                  onClick={() => onPeopleFilterChange(peer.displayName)}
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold transition active:scale-[0.98]",
                    peopleFilter === peer.displayName
                      ? "bg-[#3b82f6] text-white shadow-sm"
                      : "bg-white/8 text-white/60",
                  )}
                >
                  {peer.displayName} · {peer.contextCount}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <GlobeGpsPanel
          embedded
          theme="dark"
          onFlyToHere={onFlyToHere}
          className="mt-2 border-white/8"
        />
      </div>
    </section>
  );
}
