"use client";

import Link from "next/link";
import { memo, useCallback, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { countPendingFeedVerifyEvents } from "@/lib/feed/count-pending-feed-verify";
import { FeedSlotCardBoundary } from "@/components/feed/feed-slot-card-boundary";
import { FeedTodaySlotCard } from "@/components/feed/feed-today-slot-card";
import {
  FeedSlotPeerDetailSheet,
  type FeedSlotPeerDetailCopy,
} from "@/components/feed/feed-slot-peer-detail-sheet";
import { FeedQuickActionStrip } from "@/components/feed/feed-quick-action-strip";
import { groupFeedSlotsByWindow } from "@/lib/feed/group-feed-slots-by-window";
import { useCopy } from "@/hooks/use-copy";
import type { FeedSlotPill } from "@/lib/feed/feed-slot-pill-types";
import type {
  FeedSlotPeerContext,
  FeedSlotPeerLookup,
} from "@/lib/feed/feed-slot-peer-context-types";
import type { FeedTodaySlot } from "@/lib/feed/feed-today-slot-types";
import type { PlanWeatherFeedSnapshot } from "@/hooks/use-feed-plan-weather";
import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import type { TrafficContext } from "@/lib/context-resolver/types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { GpsPing } from "@/lib/location-ping/types";
import type { SurfaceType } from "@/lib/surface-engine/surface-contract";
import { cn } from "@/lib/utils";

function slotType(slot: FeedTodaySlot): SurfaceType {
  return slot.kind === "surface" ? slot.surface.type : slot.slotType;
}

export type FeedTodaySlotsPanelProps = {
  slots: readonly FeedTodaySlot[];
  overflowCount?: number;
  peerLookup: FeedSlotPeerLookup;
  eventsById?: ReadonlyMap<string, EventCandidate>;
  trafficByDestination?: ReadonlyMap<string, TrafficContext>;
  weatherByTarget?: ReadonlyMap<string, PlanWeatherFeedSnapshot>;
  volumesByEventId?: ReadonlyMap<string, ExperienceVolume>;
  peerDetailCopy: FeedSlotPeerDetailCopy;
  onPillPress: (slot: FeedTodaySlot, pill: FeedSlotPill) => void;
  onSpawnPrompt?: (uri: string) => void;
  onOpenPeerChat?: (peer: FeedSlotPeerContext) => void;
  onSlotOpen?: (slot: FeedTodaySlot) => void;
  onVerifyCapture?: (eventId: string) => void;
  gpsPings?: readonly GpsPing[];
  onViewAll?: () => void;
  recallEventId?: string | null;
  /** Drawer layout — header lives in FeedExperienceSlotsDrawer. */
  drawerMode?: boolean;
  activeEventId?: string | null;
  onSelectExperience?: (eventId: string, options?: { expand?: boolean }) => void;
  inlineRecall?: boolean;
  className?: string;
};

export const FeedTodaySlotsPanel = memo(function FeedTodaySlotsPanel({
  slots,
  overflowCount = 0,
  peerLookup,
  eventsById,
  trafficByDestination,
  weatherByTarget,
  volumesByEventId,
  peerDetailCopy,
  onPillPress,
  onSpawnPrompt,
  onOpenPeerChat,
  onSlotOpen,
  onVerifyCapture,
  gpsPings = [],
  onViewAll,
  recallEventId,
  drawerMode = false,
  activeEventId = null,
  onSelectExperience,
  inlineRecall = false,
  className,
}: FeedTodaySlotsPanelProps) {
  const copy = useCopy();
  const [filterType, setFilterType] = useState<SurfaceType | null>(null);
  const [detailPeer, setDetailPeer] = useState<FeedSlotPeerContext | null>(null);

  const onPeerPress = useCallback((_slot: FeedTodaySlot, peer: FeedSlotPeerContext) => {
    setDetailPeer(peer);
  }, []);

  const filteredSlots = useMemo(() => {
    if (!filterType) {
      return slots;
    }
    return slots.filter((slot) => slotType(slot) === filterType);
  }, [slots, filterType]);

  const groups = useMemo(
    () =>
      groupFeedSlotsByWindow(filteredSlots, {
        today: copy.feed.today.sectionToday,
        tomorrow: copy.feed.today.sectionTomorrow,
        later: copy.feed.today.sectionLater,
        unset: copy.feed.today.sectionUnset,
      }),
    [filteredSlots, copy.feed.today],
  );

  const totalVisible = slots.length;
  const pendingVerifyCount = useMemo(
    () => countPendingFeedVerifyEvents(eventsById?.values()),
    [eventsById],
  );
  const viewAllLabel =
    overflowCount > 0
      ? `${copy.feed.today.viewAll} (${totalVisible + overflowCount})`
      : copy.feed.today.viewAll;

  return (
    <section
      className={cn("flex min-h-0 flex-col overflow-hidden", className)}
      aria-label={copy.feed.today.ariaLabel}
      data-feed-today-slots-panel
      data-feed-drawer-mode={drawerMode ? "true" : undefined}
    >
      {!drawerMode ? (
      <header className="flex shrink-0 items-end justify-between gap-3 px-4 pb-2.5 pt-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/32">
            {copy.feed.experience.heroEyebrow}
          </p>
          <div className="mt-0.5 flex items-center gap-2">
            <h2 className="text-[22px] font-semibold tracking-tight text-white">
              {copy.feed.experience.heroTitle}
            </h2>
            {totalVisible > 0 ? (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold tabular-nums text-white/65">
                {copy.feed.today.count(totalVisible)}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[12px] text-white/38">
            {copy.feed.experience.heroSubtitle}
          </p>
          {pendingVerifyCount > 0 ? (
            <p className="mt-1 text-[11px] font-medium text-emerald-200/80">
              {copy.feed.experience.pendingVerify(pendingVerifyCount)}
            </p>
          ) : null}
        </div>

        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="flex shrink-0 items-center gap-0.5 pb-0.5 text-[12px] font-semibold text-white/48 transition-colors hover:text-white/72"
          >
            {viewAllLabel}
            <ChevronRight className="size-3.5" strokeWidth={2.4} />
          </button>
        ) : null}
      </header>
      ) : null}

      <FeedQuickActionStrip
        slots={slots}
        label={copy.feed.today.quickActions}
        filterAllLabel={copy.feed.today.filterAll}
        activeType={filterType}
        onSelectType={setFilterType}
      />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filteredSlots.length === 0 ? (
          <div className="mt-2 rounded-2xl bg-white/[0.03] px-5 py-10 text-center ring-1 ring-white/[0.05]">
            <p className="text-[15px] font-semibold text-white/70">
              {filterType ? copy.feed.today.filterEmpty : copy.feed.today.empty}
            </p>
            <p className="mx-auto mt-2 max-w-[16rem] text-[12px] leading-relaxed text-white/36">
              {filterType ? copy.feed.today.filterEmptyHint : copy.feed.today.emptyHint}
            </p>
            {!filterType ? (
              <Link
                href="/search"
                className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-black transition active:scale-[0.98]"
              >
                {copy.feed.experience.emptyCta}
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.id} data-feed-slot-window={group.id}>
                <h3 className="sticky top-0 z-[1] -mx-1 bg-rimvio-base/92 px-1 pb-1.5 pt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white/32 backdrop-blur-sm">
                  {group.label}
                </h3>
                <ul
                  className="divide-y divide-white/[0.06] rounded-2xl bg-white/[0.025] px-3 ring-1 ring-white/[0.06]"
                  data-feed-slot-list
                >
                  {group.slots.map((slot) => (
                    <li key={slot.id}>
                      <FeedSlotCardBoundary slotId={slot.id}>
                        <FeedTodaySlotCard
                          slot={slot}
                          peerLookup={peerLookup}
                          eventsById={eventsById}
                          trafficByDestination={trafficByDestination}
                          weatherByTarget={weatherByTarget}
                          volumesByEventId={volumesByEventId}
                          onPillPress={onPillPress}
                          onSpawnPrompt={onSpawnPrompt}
                          onPeerPress={onPeerPress}
                          onOpenDetail={onSlotOpen ?? (onViewAll ? () => onViewAll() : undefined)}
                          onVerifyCapture={onVerifyCapture}
                          gpsPings={gpsPings}
                          recallEventId={recallEventId}
                          activeEventId={activeEventId}
                          onSelectExperience={onSelectExperience}
                          inlineRecall={inlineRecall}
                        />
                      </FeedSlotCardBoundary>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
      <FeedSlotPeerDetailSheet
        peer={detailPeer}
        open={detailPeer !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailPeer(null);
          }
        }}
        onOpenChat={(peer) => onOpenPeerChat?.(peer)}
        copy={peerDetailCopy}
      />
    </section>
  );
});
