"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Search, SquarePen, Trash2, X, CheckSquare, Square, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { GlobeContainerSpaceFilters } from "@/components/globe/globe-container-space-filters";
import { GlobeContainerSpaceSidebarSection } from "@/components/globe/globe-container-space-sidebar-section";
import { GlobeContainerSpaceToolbar } from "@/components/globe/globe-container-space-toolbar";
import { GlobeTrendBridgePulseChip } from "@/components/globe/globe-trend-bridge-pulse-chip";
import {
  describeGlobeContextDeleteSelection,
  toastLineForGlobeContextDelete,
} from "@/lib/globe/describe-globe-context-delete-selection";
import {
  deleteGlobeContexts,
  resolveGlobeContextDeleteIntent,
} from "@/lib/globe/delete-globe-context";
import type { GlobeContextTimelineEntry } from "@/lib/globe/list-globe-context-timeline";
import { listGlobeContextTimeline } from "@/lib/globe/list-globe-context-timeline";
import type { GlobeLayerMode } from "@/lib/globe/globe-layer-mode";
import type { GlobeContextTimeFilter } from "@/lib/globe/globe-context-time-filter";
import type { GlobeContextPeopleFilter } from "@/lib/globe/globe-context-people-filter";
import type { GlobeContextPeerOption } from "@/lib/globe/list-globe-context-peer-options";
import {
  EVENT_CANDIDATES_UPDATED,
  findLifeEventCandidate,
  listLifeEventCandidates,
} from "@/lib/life-read-model";
import { PERSONAL_GLOBE_PINS_UPDATED } from "@/lib/globe/personal-globe-pin-store";
import { copy } from "@/lib/copy/human-ko";
import {
  armGlobeContextAgent,
  cancelGlobeContextAgentArm,
  subscribeGlobeContextAgent,
} from "@/lib/globe/context-agent";
import { cn } from "@/lib/utils";

export type GlobeContainerSpaceSidebarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeEventId?: string | null;
  onSelect: (entry: GlobeContextTimelineEntry) => void;
  /** Sidebar agent flow — pick one context to bind Container AI. */
  onAgentContextPick?: (entry: GlobeContextTimelineEntry) => void;
  onDeleted?: (eventIds: string[]) => void;
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

const SIDEBAR_SECTION_STORAGE_KEY = "rimvio-container-space-sections";

type SidebarSectionKey = "tools" | "filters" | "trend";

type SidebarSectionState = Record<SidebarSectionKey, boolean>;

function defaultSidebarSections(): SidebarSectionState {
  return { tools: false, filters: false, trend: false };
}

function readSidebarSections(): SidebarSectionState {
  if (typeof window === "undefined") {
    return defaultSidebarSections();
  }
  try {
    const raw = sessionStorage.getItem(SIDEBAR_SECTION_STORAGE_KEY);
    if (!raw) {
      return defaultSidebarSections();
    }
    const parsed = JSON.parse(raw) as Partial<SidebarSectionState>;
    return { ...defaultSidebarSections(), ...parsed };
  } catch {
    return defaultSidebarSections();
  }
}

function writeSidebarSections(state: SidebarSectionState): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(SIDEBAR_SECTION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

function SidebarRow({
  entry,
  active,
  selectMode,
  selected,
  onSelect,
  onToggleSelect,
}: {
  entry: GlobeContextTimelineEntry;
  active?: boolean;
  selectMode?: boolean;
  selected?: boolean;
  onSelect: (entry: GlobeContextTimelineEntry) => void;
  onToggleSelect?: (eventId: string) => void;
}) {
  const handleClick = () => {
    if (selectMode) {
      onToggleSelect?.(entry.eventId);
      return;
    }
    onSelect(entry);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      data-globe-container-space-item={entry.eventId}
      data-globe-container-space-selected={selectMode && selected ? "true" : undefined}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors",
        selectMode && selected
          ? "bg-[#ff6b4a]/15 text-white ring-1 ring-[#ff6b4a]/35"
          : active
            ? "bg-white/10 text-white"
            : "text-white/85 hover:bg-white/[0.06] active:bg-white/10",
      )}
    >
      {selectMode ? (
        <span className="flex size-8 shrink-0 items-center justify-center" aria-hidden>
          {selected ? (
            <CheckSquare className="size-[18px] text-[#ff6b4a]" />
          ) : (
            <Square className="size-[18px] text-white/40" />
          )}
        </span>
      ) : (
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold",
            active ? "bg-[#ff6b4a]/90 text-white" : "bg-white/10 text-white/90",
          )}
          aria-hidden
        >
          {contextAccent(entry.title)}
        </span>
      )}
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
  onAgentContextPick,
  onDeleted,
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
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [deleting, setDeleting] = useState(false);
  const [agentArming, setAgentArming] = useState(false);
  const [sections, setSections] = useState<SidebarSectionState>(() =>
    readSidebarSections(),
  );

  const toggleSection = (key: SidebarSectionKey) => {
    setSections((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      writeSidebarSections(next);
      return next;
    });
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    return subscribeGlobeContextAgent((detail) => {
      setAgentArming(detail.phase === "arming");
    });
  }, []);

  useEffect(() => {
    if (!open && agentArming) {
      cancelGlobeContextAgentArm();
    }
  }, [agentArming, open]);

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
      setSelectMode(false);
      setSelected(new Set());
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

  const deleteSelection = useMemo(() => {
    let detachLocal = 0;
    let deleteUpstream = 0;
    let blocked = 0;
    for (const eventId of selected) {
      const intent = resolveGlobeContextDeleteIntent(findLifeEventCandidate(eventId));
      if (intent === "detach_local") {
        detachLocal += 1;
      } else if (intent === "delete_upstream") {
        deleteUpstream += 1;
      } else {
        blocked += 1;
      }
    }
    return describeGlobeContextDeleteSelection({
      detachLocal,
      deleteUpstream,
      blocked,
      total: selected.size,
    });
  }, [selected]);

  const someSelected = selected.size > 0;
  const listEntries = useMemo(() => {
    const rows = filteredRecent.filter((row) => row.eventId !== pinned?.eventId);
    if (!pinned || query.trim()) {
      return rows;
    }
    return rows;
  }, [filteredRecent, pinned, query]);

  const toggleSelect = (eventId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (!someSelected || deleting || !deleteSelection.actionable) {
      return;
    }
    const ids = [...selected];
    const confirmed = deleteSelection.confirm
      ? window.confirm(deleteSelection.confirm)
      : false;
    if (!confirmed) {
      return;
    }
    setDeleting(true);
    try {
      const { deleted } = await deleteGlobeContexts(ids);
      if (deleted === 0) {
        toast.error(copy.globe.containerSpaceDeleteFail);
        return;
      }
      toast.success(
        toastLineForGlobeContextDelete({
          deleted,
          deleteLabel: deleteSelection.label,
        }),
      );
      onDeleted?.(ids);
      setSelected(new Set());
      setSelectMode(false);
      setRevision((value) => value + 1);
    } finally {
      setDeleting(false);
    }
  };

  const handleSelect = (entry: GlobeContextTimelineEntry) => {
    if (agentArming) {
      onAgentContextPick?.(entry);
      onOpenChange(false);
      return;
    }
    onSelect(entry);
    onOpenChange(false);
  };

  const handleAgentPress = () => {
    if (agentArming) {
      cancelGlobeContextAgentArm();
      return;
    }
    setSelectMode(false);
    setSelected(new Set());
    armGlobeContextAgent();
  };

  const handleNew = () => {
    onNewContext?.();
    onOpenChange(false);
  };

  const closeAfter = () => onOpenChange(false);

  const showPersonalTools = layerMode === "personal";
  const showTrendBridge =
    showPersonalTools && !activeEventId?.trim() && trendBridge != null;

  const filtersActive =
    timeFilter !== "all" || Boolean(peopleFilter?.trim());
  const toolsBadge =
    inboxCount > 0
      ? inboxCount > 9
        ? "9+"
        : String(inboxCount)
      : workQueueCount > 0
        ? workQueueCount > 9
          ? "9+"
          : String(workQueueCount)
        : null;
  const filtersBadge = filtersActive ? "·" : null;
  const trendBadge =
    showTrendBridge && trendBridge?.enabled
      ? copy.globe.trendBridgePulseChipOn
      : null;

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
                <div className="flex items-center gap-1">
                  {filteredRecent.length > 0 && !agentArming ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectMode) {
                          setSelectMode(false);
                          setSelected(new Set());
                          return;
                        }
                        setSelectMode(true);
                      }}
                      className={cn(
                        "rounded-full px-2.5 py-1.5 text-[12px] font-semibold transition-colors",
                        selectMode
                          ? "bg-white/12 text-white"
                          : "text-white/55 active:bg-white/10",
                      )}
                      data-globe-container-space-select-toggle
                    >
                      {selectMode
                        ? copy.globe.containerSpaceSelectDone
                        : copy.globe.containerSpaceSelect}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="flex size-9 items-center justify-center rounded-full text-white/70 active:bg-white/10"
                    aria-label={copy.globe.containerSpaceCloseAria}
                  >
                    <X className="size-5" aria-hidden />
                  </button>
                </div>
              </div>

              {!selectMode && !agentArming ? (
              <button
                type="button"
                onClick={handleNew}
                className="mt-3 flex w-full items-center gap-2 rounded-full bg-white/[0.08] px-3.5 py-2.5 text-left text-[14px] font-semibold text-white ring-1 ring-white/10 active:bg-white/12"
                data-globe-container-space-new
              >
                <SquarePen className="size-4 shrink-0 text-white/80" aria-hidden />
                {copy.globe.containerSpaceNewContext}
              </button>
              ) : agentArming ? (
                <p className="mt-3 px-1 text-[12px] leading-relaxed text-[#7eb6ff]">
                  {copy.globe.containerSpaceAgentPickHint}
                </p>
              ) : (
                <p className="mt-3 px-1 text-[12px] leading-relaxed text-white/50">
                  {copy.globe.containerSpaceSelectHint}
                </p>
              )}

              {!selectMode ? (
                <button
                  type="button"
                  onClick={handleAgentPress}
                  disabled={filteredRecent.length === 0}
                  className={cn(
                    "mt-2 flex w-full items-center gap-2 rounded-full px-3.5 py-2.5 text-left text-[14px] font-semibold ring-1 transition-colors active:scale-[0.99]",
                    agentArming
                      ? "bg-white/12 text-white ring-white/20"
                      : "bg-[#0071e3]/20 text-[#9fd0ff] ring-[#0071e3]/35 active:bg-[#0071e3]/28",
                    filteredRecent.length === 0 && "pointer-events-none opacity-40",
                  )}
                  data-globe-container-space-agent
                >
                  <Sparkles className="size-4 shrink-0" aria-hidden />
                  {agentArming
                    ? copy.globe.containerSpaceAgentArming
                    : copy.globe.containerSpaceAgentCta}
                </button>
              ) : null}

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
              <GlobeContainerSpaceSidebarSection
                sectionId="tools"
                title={copy.globe.containerSpaceToolsSection}
                expanded={sections.tools}
                onToggle={() => toggleSection("tools")}
                badge={toolsBadge}
                expandAriaLabel={copy.globe.containerSpaceSectionExpand(
                  copy.globe.containerSpaceToolsSection,
                )}
                collapseAriaLabel={copy.globe.containerSpaceSectionCollapse(
                  copy.globe.containerSpaceToolsSection,
                )}
              >
                <GlobeContainerSpaceToolbar
                  showSectionTitle={false}
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
              </GlobeContainerSpaceSidebarSection>
            ) : null}

            {showPersonalTools && onTimeFilterChange ? (
              <GlobeContainerSpaceSidebarSection
                sectionId="filters"
                title={copy.globe.containerSpaceFiltersSection}
                expanded={sections.filters}
                onToggle={() => toggleSection("filters")}
                badge={filtersBadge}
                expandAriaLabel={copy.globe.containerSpaceSectionExpand(
                  copy.globe.containerSpaceFiltersSection,
                )}
                collapseAriaLabel={copy.globe.containerSpaceSectionCollapse(
                  copy.globe.containerSpaceFiltersSection,
                )}
              >
                <GlobeContainerSpaceFilters
                  showSectionTitle={false}
                  timeFilter={timeFilter}
                  onTimeFilterChange={onTimeFilterChange}
                  peopleFilter={peopleFilter}
                  onPeopleFilterChange={onPeopleFilterChange}
                  peerOptions={peerOptions}
                  onFlyToHere={onFlyToHere}
                />
              </GlobeContainerSpaceSidebarSection>
            ) : null}

            {showTrendBridge && trendBridge ? (
              <GlobeContainerSpaceSidebarSection
                sectionId="trend"
                title={copy.globe.trendBridgePulseChipLabel}
                expanded={sections.trend}
                onToggle={() => toggleSection("trend")}
                badge={trendBadge}
                expandAriaLabel={copy.globe.containerSpaceSectionExpand(
                  copy.globe.trendBridgePulseChipLabel,
                )}
                collapseAriaLabel={copy.globe.containerSpaceSectionCollapse(
                  copy.globe.trendBridgePulseChipLabel,
                )}
              >
                <GlobeTrendBridgePulseChip
                  enabled={trendBridge.enabled}
                  activeBridgeId={trendBridge.activeBridgeId}
                  pulseIntent={trendBridge.pulseIntent}
                  onToggle={trendBridge.onToggle}
                  onBridgeSelect={trendBridge.onBridgeSelect}
                  onPulseIntentChange={trendBridge.onPulseIntentChange}
                  className="max-w-none"
                />
              </GlobeContainerSpaceSidebarSection>
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
                    selectMode={selectMode}
                    selected={selected.has(pinned.eventId)}
                    onSelect={handleSelect}
                    onToggleSelect={toggleSelect}
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
                    {listEntries.map((entry) => (
                        <SidebarRow
                          key={entry.eventId}
                          entry={entry}
                          selectMode={selectMode}
                          selected={selected.has(entry.eventId)}
                          onSelect={handleSelect}
                          onToggleSelect={toggleSelect}
                        />
                      ))}
                  </div>
                )}
              </section>
            </div>

            <div className="shrink-0 border-t border-white/8 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
              {!selectMode && stripEntries.length > 0 ? (
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
              {selectMode ? (
                <button
                  type="button"
                  disabled={!someSelected || deleting || !deleteSelection.actionable}
                  onClick={() => void handleDeleteSelected()}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold shadow-lg transition-opacity",
                    someSelected && deleteSelection.actionable
                      ? "bg-[#ef4444] text-white active:opacity-90"
                      : "bg-white/10 text-white/40",
                  )}
                  data-globe-container-space-delete
                >
                  <Trash2 className="size-4 shrink-0" aria-hidden />
                  {deleting
                    ? copy.globe.containerSpaceDeleting
                    : someSelected
                      ? deleteSelection.label
                      : copy.globe.containerSpaceSelectPrompt}
                </button>
              ) : (
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
              )}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
