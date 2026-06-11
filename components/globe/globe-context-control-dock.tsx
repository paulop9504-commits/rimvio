"use client";

import { CalendarPlus, CalendarRange, ListChecks } from "lucide-react";
import { GlobeGpsPanel } from "@/components/globe/globe-gps-panel";
import {
  resolveGlobeContextTimeFilterLabel,
  type GlobeContextTimeFilter,
} from "@/lib/globe/globe-context-time-filter";
import type { GlobeContextPeerOption } from "@/lib/globe/list-globe-context-peer-options";
import { cn } from "@/lib/utils";

const FILTERS: GlobeContextTimeFilter[] = ["all", "this_year", "this_month"];

export type GlobeContextControlDockProps = {
  timeFilter: GlobeContextTimeFilter;
  onTimeFilterChange: (value: GlobeContextTimeFilter) => void;
  peopleFilter?: string | null;
  onPeopleFilterChange?: (value: string | null) => void;
  peerOptions?: readonly GlobeContextPeerOption[];
  onCreate: () => void;
  onList: () => void;
  onManage: () => void;
  onFlyToHere?: () => void;
  className?: string;
};

/** Left-top globe controls — actions, time filter, GPS in one card. */
export function GlobeContextControlDock({
  timeFilter,
  onTimeFilterChange,
  peopleFilter = null,
  onPeopleFilterChange,
  peerOptions = [],
  onCreate,
  onList,
  onManage,
  onFlyToHere,
  className,
}: GlobeContextControlDockProps) {
  return (
    <div
      className={cn(
        "w-[min(100%,12.75rem)] overflow-hidden rounded-[1.15rem] bg-card/95 shadow-sm ring-1 ring-border backdrop-blur-md",
        className,
      )}
      data-globe-context-dock
    >
      <div className="grid grid-cols-3 gap-px bg-border/40 p-1">
        <button
          type="button"
          onClick={onCreate}
          className="flex flex-col items-center gap-0.5 rounded-[0.85rem] bg-card/95 px-1 py-2 active:scale-[0.98]"
          data-globe-create-context-trigger
        >
          <CalendarPlus className="size-3.5 text-primary" aria-hidden />
          <span className="text-[10px] font-semibold leading-tight text-foreground">
            만들기
          </span>
        </button>
        <button
          type="button"
          onClick={onList}
          className="flex flex-col items-center gap-0.5 rounded-[0.85rem] bg-card/95 px-1 py-2 active:scale-[0.98]"
          data-globe-context-list-trigger
        >
          <CalendarRange className="size-3.5 text-primary" aria-hidden />
          <span className="text-[10px] font-semibold leading-tight text-foreground">
            내 맥락
          </span>
        </button>
        <button
          type="button"
          onClick={onManage}
          className="flex flex-col items-center gap-0.5 rounded-[0.85rem] bg-card/95 px-1 py-2 active:scale-[0.98]"
          data-globe-context-manage-trigger
        >
          <ListChecks className="size-3.5 text-primary" aria-hidden />
          <span className="text-[10px] font-semibold leading-tight text-foreground">
            관리
          </span>
        </button>
      </div>

      {onPeopleFilterChange && peerOptions.length > 0 ? (
        <div
          className="border-t border-border/60 px-2 py-1.5"
          data-globe-context-people-rail
        >
          <p className="mb-1 px-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            사람
          </p>
          <div className="flex gap-1 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => onPeopleFilterChange(null)}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold transition active:scale-[0.98]",
                !peopleFilter
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/80 text-muted-foreground",
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
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/80 text-muted-foreground",
                )}
                data-globe-people-filter={peer.displayName}
              >
                {peer.displayName} · {peer.contextCount}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div
        className="border-t border-border/60 px-2 py-1.5"
        data-globe-context-time-filter
      >
        <div className="flex rounded-full bg-muted/80 p-0.5 ring-1 ring-border/50">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => onTimeFilterChange(filter)}
              className={cn(
                "min-w-0 flex-1 rounded-full px-1 py-1 text-[10px] font-semibold transition active:scale-[0.98]",
                timeFilter === filter
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              {resolveGlobeContextTimeFilterLabel(filter)}
            </button>
          ))}
        </div>
      </div>

      <GlobeGpsPanel embedded onFlyToHere={onFlyToHere} />
    </div>
  );
}
