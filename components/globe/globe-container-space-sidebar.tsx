"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  Filter,
  Search,
  Settings2,
  SquarePen,
  Trash2,
  X,
  CheckSquare,
  Square,
  Sparkles,
} from "lucide-react";
import { GlobeContextRuntimePanel } from "@/components/globe/globe-context-runtime-panel";
import { toast } from "sonner";
import { GlobeContainerSpaceFilters } from "@/components/globe/globe-container-space-filters";
import { GlobeContainerSpaceToolbar } from "@/components/globe/globe-container-space-toolbar";
import { GlobeTrendBridgePulseChip } from "@/components/globe/globe-trend-bridge-pulse-chip";
import { GlobeResumeInviteSection } from "@/components/globe/globe-resume-invite-section";
import { GlobeResumeSidebarList } from "@/components/globe/globe-resume-sidebar-list";
import { fetchSocialLayer } from "@/lib/peer-chat/peer-chat-client";
import type { SocialBubblePeer } from "@/lib/social/bubble-state";
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
  bindGlobeContextAgent,
  cancelGlobeContextAgentArm,
  readGlobeContextAgentSession,
  subscribeGlobeContextAgent,
} from "@/lib/globe/context-agent";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

function formatSidebarRelativeTime(sortMs: number, nowMs = Date.now()): string {
  if (!Number.isFinite(sortMs) || sortMs <= 0) return "";
  const delta = Math.max(0, nowMs - sortMs);
  const sec = Math.floor(delta / 1000);
  if (sec < 45) return "지금";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 14) return `${day}d`;
  return new Date(sortMs).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

export type GlobeContainerSpaceSidebarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeEventId?: string | null;
  onSelect: (entry: GlobeContextTimelineEntry) => void;
  onFlyToRuntime?: (lat: number, lng: number) => void;
  /** Sidebar agent flow — pick one context to bind Container AI. */
  onAgentContextPick?: (
    entry: GlobeContextTimelineEntry,
  ) => void | Promise<void>;
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

function flattenRecentEntries(
  timeline: ReturnType<typeof listGlobeContextTimeline>,
  limit = 14,
): GlobeContextTimelineEntry[] {
  return [...timeline.present, ...timeline.future, ...timeline.past]
    .sort((left, right) => right.sortMs - left.sortMs)
    .slice(0, limit);
}

const SIDEBAR_SECTION_STORAGE_KEY = "rimvio-container-space-sections";

type SidebarSectionKey = "customize";

type SidebarSectionState = Record<SidebarSectionKey, boolean>;

function defaultSidebarSections(): SidebarSectionState {
  return { customize: false };
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

function CursorActionRow({
  icon: Icon,
  label,
  onClick,
  active,
  badge,
  disabled,
  dataId,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
  badge?: string | null;
  disabled?: boolean;
  dataId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-globe-container-space-action={dataId}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2 py-[7px] text-left text-[13px] transition-colors",
        active
          ? "bg-white/[0.08] text-white"
          : "text-white/80 hover:bg-white/[0.05] hover:text-white",
        disabled && "pointer-events-none opacity-35",
      )}
    >
      <Icon className="size-[15px] shrink-0 text-white/55" aria-hidden />
      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
      {badge ? (
        <span className="shrink-0 rounded-full bg-[#3b82f6] px-1.5 py-px text-[9px] font-bold leading-none text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function SidebarRow({
  entry,
  active,
  selectMode,
  selected,
  agentPickMode,
  onSelect,
  onToggleSelect,
}: {
  entry: GlobeContextTimelineEntry;
  active?: boolean;
  selectMode?: boolean;
  selected?: boolean;
  agentPickMode?: boolean;
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
  const relative = formatSidebarRelativeTime(entry.sortMs);

  return (
    <button
      type="button"
      onClick={handleClick}
      data-globe-container-space-item={entry.eventId}
      data-globe-container-space-selected={selectMode && selected ? "true" : undefined}
      className={cn(
        "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
        selectMode && selected
          ? "bg-[#ff6b4a]/12 text-white"
          : agentPickMode
            ? "text-white hover:bg-[#0071e3]/12"
            : active
              ? "bg-white/[0.09] text-white"
              : "text-white/85 hover:bg-white/[0.05]",
      )}
    >
      {selectMode ? (
        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center" aria-hidden>
          {selected ? (
            <CheckSquare className="size-3.5 text-[#ff6b4a]" />
          ) : (
            <Square className="size-3.5 text-white/35" />
          )}
        </span>
      ) : (
        <span
          className={cn(
            "mt-1.5 size-1.5 shrink-0 rounded-full",
            active ? "bg-[#3182f6]" : "bg-white/25",
          )}
          aria-hidden
        />
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[13px] font-medium leading-snug">
            {entry.title}
          </span>
          {relative ? (
            <span className="shrink-0 text-[11px] tabular-nums text-white/35">
              {relative}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-white/40">
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
  onFlyToRuntime,
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
  const [agentPickMode, setAgentPickMode] = useState(false);
  const [sections, setSections] = useState<SidebarSectionState>(() =>
    readSidebarSections(),
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [detailEntry, setDetailEntry] = useState<GlobeContextTimelineEntry | null>(
    null,
  );
  const [socialPeers, setSocialPeers] = useState<SocialBubblePeer[] | null>(null);
  const pendingAgentBindRef = useRef(false);
  const agentPressBusyRef = useRef(false);

  const toggleSection = (key: SidebarSectionKey) => {
    setSections((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      writeSidebarSections(next);
      return next;
    });
  };

  useEffect(() => {
    if (!searchOpen) return;
    searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const syncAgentSession = (detail: ReturnType<typeof readGlobeContextAgentSession>) => {
      setAgentArming(detail.phase === "arming");
      setAgentPickMode(detail.phase === "arming");
    };
    syncAgentSession(readGlobeContextAgentSession());
    return subscribeGlobeContextAgent(syncAgentSession);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectMode(false);
      setSelected(new Set());
      setDetailEntry(null);
      return;
    }
    const session = readGlobeContextAgentSession();
    setAgentArming(session.phase === "arming");
    setAgentPickMode(session.phase === "arming");
    let cancelled = false;
    void fetchSocialLayer()
      .then((layer) => {
        if (cancelled) return;
        setSocialPeers([...layer.pinned, ...layer.archive]);
      })
      .catch(() => {
        if (!cancelled) setSocialPeers(null);
      });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelled = true;
      document.body.style.overflow = prev;
    };
  }, [open]);

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

  const isAgentArming =
    agentPickMode || readGlobeContextAgentSession().phase === "arming";

  const commitContextAgentBind = useCallback(
    async (entry: GlobeContextTimelineEntry) => {
      const eventId = entry.eventId.trim();
      if (!eventId || !onAgentContextPick || agentPressBusyRef.current) {
        return;
      }
      agentPressBusyRef.current = true;
      pendingAgentBindRef.current = true;
      setAgentPickMode(false);
      setDetailEntry(null);
      bindGlobeContextAgent(eventId);
      onOpenChange(false);
      try {
        await onAgentContextPick(entry);
      } finally {
        pendingAgentBindRef.current = false;
        agentPressBusyRef.current = false;
      }
    },
    [onAgentContextPick, onOpenChange],
  );

  const handleSelect = (entry: GlobeContextTimelineEntry) => {
    if (isAgentArming) {
      void commitContextAgentBind(entry);
      return;
    }
    if (selectMode) {
      return;
    }
    setDetailEntry(entry);
    onSelect(entry);
  };

  const detailEvent = useMemo(() => {
    void revision;
    const eventId = detailEntry?.eventId?.trim();
    return eventId ? findLifeEventCandidate(eventId) : null;
  }, [detailEntry?.eventId, revision]);

  const handleAgentPress = useCallback(async () => {
    if (agentPressBusyRef.current) {
      return;
    }
    if (isAgentArming) {
      cancelGlobeContextAgentArm();
      setAgentPickMode(false);
      return;
    }
    if (!onAgentContextPick) {
      return;
    }
    setSelectMode(false);
    setSelected(new Set());
    if (detailEntry) {
      await commitContextAgentBind(detailEntry);
      return;
    }
    setDetailEntry(null);
    armGlobeContextAgent();
    setAgentPickMode(true);
  }, [
    commitContextAgentBind,
    detailEntry,
    isAgentArming,
    onAgentContextPick,
  ]);

  const agentCtaLabel = detailEntry
    ? copy.globe.containerSpaceAgentBindDetail
    : isAgentArming
      ? copy.globe.containerSpaceAgentArming
      : copy.globe.containerSpaceAgentCta;

  const showAgentCta = Boolean(onAgentContextPick) && !selectMode;
  const agentCtaDisabled =
    !detailEntry && recent.length === 0 && listEntries.length === 0 && !pinned;

  const handleNew = () => {
    onNewContext?.();
    onOpenChange(false);
  };

  const closeAfter = () => onOpenChange(false);

  const showPersonalTools = layerMode === "personal";
  const showTrendBridge =
    showPersonalTools && !activeEventId?.trim() && trendBridge != null;
  const showCustomizeToggle =
    showPersonalTools &&
    !detailEntry &&
    (Boolean(
      onCreatePhoto &&
        onOpenList &&
        onOpenManage &&
        onOpenInbox &&
        onOpenMediaPool &&
        onOpenSettings &&
        onOpenWorkQueue &&
        onPortalPeekToggle,
    ) ||
      Boolean(onTimeFilterChange) ||
      showTrendBridge);

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
  const customizeBadge =
    toolsBadge ??
    (filtersActive ? "·" : null) ??
    (showTrendBridge && trendBridge?.enabled
      ? copy.globe.trendBridgePulseChipOn
      : null);
  const customizeOpen = sections.customize;

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
            className="fixed bottom-0 left-0 top-0 z-[10041] flex w-[min(88vw,18.5rem)] flex-col bg-[#0c0e12] text-white shadow-2xl ring-1 ring-white/8"
            data-globe-container-space-sidebar
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="shrink-0 px-2.5 pb-1 pt-[max(0.65rem,env(safe-area-inset-top))]">
              <div className="mb-1 flex items-center justify-between gap-1 px-1">
                <div className="flex min-w-0 items-center gap-0.5">
                  {detailEntry ? (
                    <button
                      type="button"
                      onClick={() => setDetailEntry(null)}
                      className="flex size-8 shrink-0 items-center justify-center rounded-md text-white/65 hover:bg-white/[0.06]"
                      aria-label={copy.globe.containerSpaceRuntimeBack}
                    >
                      <ChevronLeft className="size-4" aria-hidden />
                    </button>
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold tracking-tight text-white/90">
                      {detailEntry
                        ? copy.globe.containerSpaceRuntimeTitle
                        : copy.globe.containerSpaceTitle}
                    </p>
                    {detailEntry ? (
                      <p className="truncate text-[11px] text-white/40">
                        {detailEntry.title}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {filteredRecent.length > 0 && !isAgentArming && !detailEntry ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectMode) {
                          setSelectMode(false);
                          setSelected(new Set());
                          return;
                        }
                        setSelectMode(true);
                        setSearchOpen(false);
                        setSections((prev) => {
                          const next = { ...prev, customize: false };
                          writeSidebarSections(next);
                          return next;
                        });
                      }}
                      className={cn(
                        "rounded-md px-2 py-1 text-[11px] font-semibold transition-colors",
                        selectMode
                          ? "bg-white/10 text-white"
                          : "text-white/45 hover:bg-white/[0.06] hover:text-white/80",
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
                    className="flex size-8 items-center justify-center rounded-md text-white/55 hover:bg-white/[0.06] hover:text-white/80"
                    aria-label={copy.globe.containerSpaceCloseAria}
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
              </div>

              {!detailEntry && !selectMode && !isAgentArming ? (
                <div className="space-y-0.5 px-0.5" data-globe-container-space-actions>
                  <CursorActionRow
                    icon={SquarePen}
                    label={copy.globe.containerSpaceNewContext}
                    onClick={handleNew}
                    dataId="new"
                  />
                  <CursorActionRow
                    icon={Search}
                    label={copy.globe.containerSpaceActionSearch}
                    onClick={() => setSearchOpen((value) => !value)}
                    active={searchOpen || Boolean(query.trim())}
                    dataId="search"
                  />
                  {showAgentCta ? (
                    <CursorActionRow
                      icon={Sparkles}
                      label={agentCtaLabel}
                      onClick={() => void handleAgentPress()}
                      active={isAgentArming}
                      disabled={agentCtaDisabled}
                      dataId="agent"
                    />
                  ) : null}
                  {showCustomizeToggle ? (
                    <CursorActionRow
                      icon={Settings2}
                      label={copy.globe.containerSpaceActionCustomize}
                      onClick={() => toggleSection("customize")}
                      active={customizeOpen}
                      badge={customizeBadge}
                      dataId="customize"
                    />
                  ) : null}
                </div>
              ) : isAgentArming ? (
                <p className="px-2 py-1.5 text-[12px] leading-relaxed text-[#7eb6ff]">
                  {copy.globe.containerSpaceAgentSidebarPickHint}
                </p>
              ) : selectMode ? (
                <p className="px-2 py-1.5 text-[12px] leading-relaxed text-white/45">
                  {copy.globe.containerSpaceSelectHint}
                </p>
              ) : null}

              {!detailEntry && (searchOpen || query.trim()) ? (
                <label className="relative mt-1.5 block px-0.5">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/30"
                    aria-hidden
                  />
                  <input
                    ref={searchInputRef}
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={copy.globe.containerSpaceSearchPlaceholder}
                    className="w-full rounded-md border-0 bg-white/[0.05] py-1.5 pl-8 pr-2 text-[12px] text-white placeholder:text-white/30 outline-none ring-1 ring-white/8 focus:ring-white/18"
                  />
                </label>
              ) : null}
            </div>

            {customizeOpen && !detailEntry && !selectMode && !isAgentArming ? (
              <div
                className="shrink-0 space-y-3 border-b border-white/6 px-2.5 py-2.5"
                data-globe-container-space-customize
              >
                {showPersonalTools &&
                onCreatePhoto &&
                onOpenList &&
                onOpenManage &&
                onOpenInbox &&
                onOpenMediaPool &&
                onOpenSettings &&
                onOpenWorkQueue &&
                onPortalPeekToggle ? (
                  <div>
                    <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-white/35">
                      {copy.globe.containerSpaceToolsSection}
                    </p>
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
                  </div>
                ) : null}
                {showPersonalTools && onTimeFilterChange ? (
                  <div>
                    <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-white/35">
                      <Filter className="size-3" aria-hidden />
                      {copy.globe.containerSpaceFiltersSection}
                    </p>
                    <GlobeContainerSpaceFilters
                      showSectionTitle={false}
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
                  <div>
                    <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-white/35">
                      {copy.globe.trendBridgePulseChipLabel}
                    </p>
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
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 [scrollbar-width:thin]">
              {detailEntry ? (
                detailEvent ? (
                  <GlobeContextRuntimePanel
                    event={detailEvent}
                    onFlyTo={onFlyToRuntime}
                    onChanged={() => setRevision((value) => value + 1)}
                  />
                ) : (
                  <p className="px-2 py-8 text-center text-[13px] leading-relaxed text-white/45">
                    {copy.globe.containerSpaceRuntimeEmpty.split("\n").map((line, index) => (
                      <span key={line}>
                        {index > 0 ? <br /> : null}
                        {line}
                      </span>
                    ))}
                  </p>
                )
              ) : selectMode || isAgentArming ? (
                <>
                  {pinned ? (
                    <section className="mb-3 px-0.5" data-globe-container-space-pinned>
                      <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-white/35">
                        {copy.globe.containerSpacePinned}
                      </p>
                      <SidebarRow
                        entry={pinned}
                        active
                        selectMode={selectMode}
                        selected={selected.has(pinned.eventId)}
                        agentPickMode={isAgentArming}
                        onSelect={handleSelect}
                        onToggleSelect={toggleSelect}
                      />
                    </section>
                  ) : null}
                  <section className="px-0.5" data-globe-container-space-recent>
                    <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-white/35">
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
                      <div className="space-y-px">
                        {listEntries.map((entry) => (
                          <SidebarRow
                            key={entry.eventId}
                            entry={entry}
                            selectMode={selectMode}
                            selected={selected.has(entry.eventId)}
                            agentPickMode={isAgentArming}
                            onSelect={handleSelect}
                            onToggleSelect={toggleSelect}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                </>
              ) : (
                <div className="px-0.5 pt-1" data-globe-resume-shell>
                  <GlobeResumeInviteSection
                    enabled={open}
                    onAccepted={(contextEventId) => {
                      setRevision((value) => value + 1);
                      const timeline = listGlobeContextTimeline(
                        listLifeEventCandidates(),
                      );
                      const entry =
                        recent.find((row) => row.eventId === contextEventId) ??
                        [...timeline.future, ...timeline.present, ...timeline.past].find(
                          (row) => row.eventId === contextEventId,
                        ) ??
                        null;
                      if (entry) {
                        onSelect(entry);
                      }
                    }}
                  />
                  <GlobeResumeSidebarList
                    activeEventId={activeEventId}
                    socialPeers={socialPeers}
                    query={query}
                    revision={revision}
                    onWorkspaceOpened={(contextEventId) => {
                      const entry =
                        recent.find((row) => row.eventId === contextEventId) ?? null;
                      if (entry) onSelect(entry);
                      closeAfter();
                    }}
                    onWorkspaceFallback={(contextEventId) => {
                      const entry =
                        recent.find((row) => row.eventId === contextEventId) ??
                        listGlobeContextTimeline(listLifeEventCandidates()).find(
                          (row) => row.eventId === contextEventId,
                        ) ??
                        null;
                      if (entry) {
                        onSelect(entry);
                        closeAfter();
                      } else {
                        toast.message(copy.globe.resumeSidebarWorkspaceOpenFailed);
                      }
                    }}
                    onFriendOpened={() => {
                      closeAfter();
                    }}
                  />
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-white/6 px-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2">
              {selectMode ? (
                <button
                  type="button"
                  disabled={!someSelected || deleting || !deleteSelection.actionable}
                  onClick={() => void handleDeleteSelected()}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-[12px] font-semibold transition-opacity",
                    someSelected && deleteSelection.actionable
                      ? "bg-[#ef4444] text-white active:opacity-90"
                      : "bg-white/8 text-white/35",
                  )}
                  data-globe-container-space-delete
                >
                  <Trash2 className="size-3.5 shrink-0" aria-hidden />
                  {deleting
                    ? copy.globe.containerSpaceDeleting
                    : someSelected
                      ? deleteSelection.label
                      : copy.globe.containerSpaceSelectPrompt}
                </button>
              ) : detailEntry && showAgentCta ? (
                <CursorActionRow
                  icon={Sparkles}
                  label={agentCtaLabel}
                  onClick={() => void handleAgentPress()}
                  active={isAgentArming}
                  disabled={agentCtaDisabled}
                  dataId="agent-detail"
                />
              ) : onOpenSettings && !detailEntry && !isAgentArming ? (
                <CursorActionRow
                  icon={Settings2}
                  label={copy.globe.containerSpaceSettings}
                  onClick={() => {
                    onOpenSettings();
                    closeAfter();
                  }}
                  dataId="settings"
                />
              ) : null}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
