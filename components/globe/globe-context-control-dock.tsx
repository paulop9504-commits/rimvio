"use client";

import { useState } from "react";
import { CalendarRange, ChevronDown, ImagePlus, ListChecks } from "lucide-react";
import { GlobeFloatingMenu } from "@/components/globe/globe-floating-menu";
import { GlobeGpsPanel } from "@/components/globe/globe-gps-panel";
import { copy } from "@/lib/copy/human-ko";
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

/** Left-top globe controls — keep browse visible, tuck filters/tools away. */
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
  const [menuOpen, setMenuOpen] = useState(false);
  const hasActiveFilters = timeFilter !== "all" || Boolean(peopleFilter?.trim());

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full bg-card/95 p-1 shadow-sm ring-1 ring-border backdrop-blur-md",
        className,
      )}
      data-globe-context-dock
      data-globe-context-dock-expanded={menuOpen ? "true" : "false"}
    >
      <button
        type="button"
        onClick={onList}
        className="relative flex min-w-0 items-center gap-1 rounded-full px-3 py-2 text-left active:scale-[0.98]"
        data-globe-context-list-trigger
      >
        <CalendarRange className="size-3.5 shrink-0 text-primary" aria-hidden />
        <span className="truncate text-[11px] font-semibold text-foreground">
          {copy.globe.listTitle}
        </span>
        {!menuOpen && hasActiveFilters ? (
          <span className="absolute right-2 top-1.5 size-1.5 rounded-full bg-primary" aria-hidden />
        ) : null}
      </button>

      <GlobeFloatingMenu
        open={menuOpen}
        onOpenChange={setMenuOpen}
        panelClassName="w-[min(calc(100vw-1.5rem),14rem)] p-1.5"
        trigger={
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className={cn(
              "relative flex size-9 shrink-0 items-center justify-center rounded-full bg-card/95 active:scale-[0.98]",
              menuOpen && "bg-muted/60",
            )}
            aria-expanded={menuOpen}
            aria-label={
              menuOpen ? copy.globe.dockCollapseAria : copy.globe.dockExpandAria
            }
            data-globe-context-dock-toggle
          >
            <ChevronDown
              className={cn(
                "size-3.5 text-muted-foreground transition-transform duration-200",
                menuOpen && "rotate-180",
              )}
              aria-hidden
            />
            {!menuOpen && hasActiveFilters ? (
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" />
            ) : null}
          </button>
        }
      >
        <div className="space-y-1" data-globe-context-dock-menu>
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onCreate();
              }}
              className="flex items-center gap-2 rounded-[0.85rem] px-2.5 py-2 text-left active:bg-muted/70"
              data-globe-create-context-trigger
            >
              <ImagePlus className="size-3.5 text-primary" aria-hidden />
              <span className="text-[11px] font-semibold text-foreground">
                {copy.globe.dockCreateAria}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onManage();
              }}
              className="flex items-center gap-2 rounded-[0.85rem] px-2.5 py-2 text-left active:bg-muted/70"
              data-globe-context-manage-trigger
            >
              <ListChecks className="size-3.5 text-primary" aria-hidden />
              <span className="text-[11px] font-semibold text-foreground">
                {copy.globe.dockManageLabel}
              </span>
            </button>
          </div>

          {onPeopleFilterChange && peerOptions.length > 0 ? (
            <div className="border-t border-border/60 px-1.5 py-1.5" data-globe-context-people-rail>
              <div className="flex flex-wrap gap-1">
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

          <div className="border-t border-border/60 px-1.5 py-1.5" data-globe-context-time-filter>
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
      </GlobeFloatingMenu>
    </div>
  );
}
