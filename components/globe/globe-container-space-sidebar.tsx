"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Search, SquarePen, X } from "lucide-react";
import { GlobeContainerSpaceFilters } from "@/components/globe/globe-container-space-filters";
import { GlobeContainerSpaceToolbar } from "@/components/globe/globe-container-space-toolbar";
import { GlobeTrendBridgePulseChip } from "@/components/globe/globe-trend-bridge-pulse-chip";
import type { GlobeContextTimelineEntry } from "@/lib/globe/list-globe-context-timeline";
import { listGlobeContextTimeline } from "@/lib/globe/list-globe-context-timeline";
import type { GlobeLayerMode } from "@/lib/globe/globe-layer-mode";
import type { GlobeContextTimeFilter } from "@/lib/globe/globe-context-time-filter";
import type { GlobeContextPeopleFilter } from "@/lib/globe/globe-context-people-filter";
import type { GlobeContextPeerOption } from "@/lib/globe/list-globe-context-peer-options";
import {
  EVENT_CANDIDATES_UPDATED,
  listLifeEventCandidates,
} from "@/lib/life-read-model";
import { PERSONAL_GLOBE_PINS_UPDATED } from "@/lib/globe/personal-globe-pin-store";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeContainerSpaceSidebarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeEventId?: string | null;
  onSelect: (entry: GlobeContextTimelineEntry) => void;
  onNewContext?: () => void;
  layerMode?: GlobeLayerMode;
  timeFilter?: GlobeContextTimeFilter;
  onTimeFilterChange?: (filter: GlobeContextTimeFilter) => void;
  peopleFilter?: GlobeContextPeopleFilter;
  onPeopleFilterChange?: (filter: GlobeContextPeopleFilter) => void;
  peerOptions?: readonly GlobeContextPeerOption[];
  onCreatePhoto?: () => void;
  onOpenList?: () => void;
  onOpenManage?: () => void;
  onFlyToHere?: () => void;
  inboxCount?: number;
  mediaPoolCount?: number;
  marketManageCount?: number;
  workQueueCount?: number;
  onOpenInbox?: () => void;
  onOpenMediaPool?: () => void;
  onOpenMarketManage?: () => void;
  onOpenSettings?: () => void;
  onOpenWorkQueue?: () => void;
  onPortalPeekToggle?: () => void;
  memoryRecall?: {
    hasContent: boolean;
    open: boolean;
    onToggle: () => void;
  } | null;
  trendBridge?: {
    enabled: boolean;
    activeBridgeId: string | null;
    pulseIntent: "align" | "avoid";
    onToggle: (enabled: boolean) => void;
    onBridgeSelect: (bridgeId: string) => void;
    onPulseIntentChange: (intent: "align" | "avoid") => void;
  } | null;
};

function contextAccent(title: string): string {
  const trimmed = title.trim();
  return trimmed ? trimmed.slice(0, 1) : "·";
}

function flattenRecentEntries(
  timeline: ReturnType<typeof listGlobeContextTimeline>,
  limit = 14,
): GlobeContextTimelineEntry[] {
  return [...timeline.present, ...timeline.future, ...timeline.past]
    .sort((left, right) => right.sortMs - left.sortMs)
    .slice(0, limit);
}

function SidebarRow({
  entry,
  active,
  onSelect,
}: {
  entry: GlobeContextTimelineEntry;
  active?: boolean;
  onSelect: (entry: GlobeContextTimelineEntry) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(entry)}
      data-globe-container-space-item={entry.eventId}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors",
        active
          ? "bg-white/10 text-white"
          : "text-white/85 hover:bg-white/[0.06] active:bg-white/10",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold",
          active ? "bg-[#ff6b4a]/90 text-white" : "bg-white/10 text-white/90",
        )}
        aria-hidden
      >
        {contextAccent(entry.title)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium leading-snug">
          {entry.title}
        </span>
        <span className="block truncate text-[11px] text-white/45">
          {entry.place || entry.rangeLabel || entry.dateLabel || "맥락"}
        </span>
      </span>
    </button>
  );
}

/** ChatGPT/Gemini-style left container space — contexts as rooms. */
export function GlobeContainerSpaceSidebar({
  open,
  onOpenChange,
  activeEventId = null,
  onSelect,
  onNewContext,
  layerMode = "personal",
  timeFilter = "all",
  onTimeFilterChange,
  peopleFilter = null,
  onPeopleFilterChange,
  peerOptions = [],
  onCreatePhoto,
  onOpenList,
  onOpenManage,
  onFlyToHere,
  inboxCount = 0,
  mediaPoolCount = 0,
  marketManageCount = 0,
  workQueueCount = 0,
  onOpenInbox,
  onOpenMediaPool,
  onOpenMarketManage,
  onOpenSettings,
  onOpenWorkQueue,
  onPortalPeekToggle,
  memoryRecall = null,
  trendBridge = null,
}: GlobeContainerSpaceSidebarProps) {
  const [mounted, setMounted] = useState(false);
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || typeof window === "undefined") {
      return;
    }
    const bump = () => setRevision((value) => value + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    window.addEventListener(PERSONAL_GLOBE_PINS_UPDATED, bump);
    return () => {
      window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
      window.removeEventListener(PERSONAL_GLOBE_PINS_UPDATED, bump);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const timeline = useMemo(() => {
    void revision;
    return listGlobeContextTimeline(listLifeEventCandidates());
  }, [revision]);

  const recent = useMemo(() => flattenRecentEntries(timeline), [timeline]);

  const filteredRecent = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return recent;
    }
    return recent.filter(
      (entry) =>
        entry.title.toLowerCase().includes(needle) ||
        entry.place.toLowerCase().includes(needle),
    );
  }, [query, recent]);

  const pinned = useMemo(() => {
    const id = activeEventId?.trim();
    if (!id) {
      return null;
    }
    return recent.find((row) => row.eventId === id) ?? null;
  }, [activeEventId, recent]);

  const stripEntries = useMemo(() => recent.slice(0, 4), [recent]);

  const handleSelect = (entry: GlobeContextTimelineEntry) => {
    onSelect(entry);
    onOpenChange(false);
  };

  const handleNew = () => {
    onNewContext?.();
    onOpenChange(false);
  };

  const closeAfter = () => onOpenChange(false);

  const showPersonalTools = layerMode === "personal";
  const showTrendBridge =
    showPersonalTools && !activeEventId?.trim() && trendBridge != null;

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label={copy.globe.containerSpaceCloseAria}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10040] bg-black/45 backdrop-blur-[2px]"
            onClick={() => onOpenChange(false)}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={copy.globe.containerSpaceTitle}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="fixed bottom-0 left-0 top-0 z-[10041] flex w-[min(88vw,19.5rem)] flex-col bg-[#0a0f18] text-white shadow-2xl ring-1 ring-white/10"
            data-globe-container-space-sidebar
          >
            <div className="shrink-0 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[17px] font-semibold tracking-tight">
                  {copy.globe.containerSpaceTitle}
                </p>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex size-9 items-center justify-center rounded-full text-white/70 active:bg-white/10"
                  aria-label={copy.globe.containerSpaceCloseAria}
                >
                  <X className="size-5" aria-hidden />
                </button>
              </div>

              <button
                type="button"
                onClick={handleNew}
                className="mt-3 flex w-full items-center gap-2 rounded-full bg-white/[0.08] px-3.5 py-2.5 text-left text-[14px] font-semibold text-white ring-1 ring-white/10 active:bg-white/12"
                data-globe-container-space-new
              >
                <SquarePen className="size-4 shrink-0 text-white/80" aria-hidden />
                {copy.globe.containerSpaceNewContext}
              </button>

              <label className="relative mt-2.5 block">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35"
                  aria-hidden
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={copy.globe.containerSpaceSearchPlaceholder}
                  className="w-full rounded-full border-0 bg-white/[0.06] py-2 pl-9 pr-3 text-[13px] text-white placeholder:text-white/35 outline-none ring-1 ring-white/8 focus:ring-white/20"
                />
              </label>
            </div>

            {showPersonalTools &&
            onCreatePhoto &&
            onOpenList &&
            onOpenManage &&
            onOpenInbox &&
            onOpenMediaPool &&
            onOpenSettings &&
            onOpenWorkQueue &&
            onPortalPeekToggle ? (
              <div className="shrink-0 border-b border-white/8 px-3 pb-3">
                <GlobeContainerSpaceToolbar
                  onCreatePhoto={onCreatePhoto}
                  onOpenList={onOpenList}
                  onOpenManage={onOpenManage}
                  onPortalPeekToggle={onPortalPeekToggle}
                  inboxCount={inboxCount}
                  mediaPoolCount={mediaPoolCount}
                  marketManageCount={marketManageCount}
                  workQueueCount={workQueueCount}
                  onOpenInbox={onOpenInbox}
                  onOpenMediaPool={onOpenMediaPool}
                  onOpenMarketManage={onOpenMarketManage}
                  onOpenSettings={onOpenSettings}
                  onOpenWorkQueue={onOpenWorkQueue}
                  onAfterAction={closeAfter}
                  memoryRecall={memoryRecall}
                />
              </div>
            ) : null}

            {showPersonalTools && onTimeFilterChange ? (
              <div className="shrink-0 border-b border-white/8 py-3">
                <GlobeContainerSpaceFilters
                  timeFilter={timeFilter}
                  onTimeFilterChange={onTimeFilterChange}
                  peopleFilter={peopleFilter}
                  onPeopleFilterChange={onPeopleFilterChange}
                  peerOptions={peerOptions}
                  onFlyToHere={onFlyToHere}
                />
              </div>
            ) : null}

            {showTrendBridge && trendBridge ? (
              <div className="shrink-0 border-b border-white/8 px-3 py-3">
                <GlobeTrendBridgePulseChip
                  enabled={trendBridge.enabled}
                  activeBridgeId={trendBridge.activeBridgeId}
                  pulseIntent={trendBridge.pulseIntent}
                  onToggle={trendBridge.onToggle}
                  onBridgeSelect={trendBridge.onBridgeSelect}
                  onPulseIntentChange={trendBridge.onPulseIntentChange}
                  className="max-w-none"
                />
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 [scrollbar-width:thin]">
              {pinned ? (
                <section className="mb-4 px-1" data-globe-container-space-pinned>
                  <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">
                    {copy.globe.containerSpacePinned}
                  </p>
                  <SidebarRow
                    entry={pinned}
                    active
                    onSelect={handleSelect}
                  />
                </section>
              ) : null}

              <section className="px-1" data-globe-container-space-recent>
                <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">
                  {copy.globe.containerSpaceRecent}
                </p>
                {filteredRecent.length === 0 ? (
                  <p className="px-2 py-6 text-[13px] leading-relaxed text-white/45">
                {copy.globe.containerSpaceEmpty.split("\n").map((line, index) => (
                  <span key={line}>
                    {index > 0 ? <br /> : null}
                    {line}
                  </span>
                ))}
                  </p>
                ) : (
                  <div className="space-y-0.5">
                    {filteredRecent
                      .filter((row) => row.eventId !== pinned?.eventId)
                      .map((entry) => (
                        <SidebarRow
                          key={entry.eventId}
                          entry={entry}
                          onSelect={handleSelect}
                        />
                      ))}
                  </div>
                )}
              </section>
            </div>

            <div className="shrink-0 border-t border-white/8 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
              {stripEntries.length > 0 ? (
                <div className="mb-3 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {stripEntries.map((entry) => {
                    const active = entry.eventId === activeEventId;
                    return (
                      <button
                        key={entry.eventId}
                        type="button"
                        onClick={() => handleSelect(entry)}
                        className={cn(
                          "flex size-12 shrink-0 flex-col items-center justify-center rounded-xl text-[11px] font-semibold ring-1 transition-colors",
                          active
                            ? "bg-[#ff6b4a]/90 text-white ring-[#ff6b4a]/50"
                            : "bg-white/8 text-white/85 ring-white/10 active:bg-white/12",
                        )}
                        title={entry.title}
                      >
                        {contextAccent(entry.title)}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleNew}
                  className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-[#3b82f6] px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg active:opacity-90"
                  data-globe-container-space-compose
                >
                  <Plus className="size-4 shrink-0" aria-hidden />
                  {copy.globe.containerSpaceComposeCta}
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
