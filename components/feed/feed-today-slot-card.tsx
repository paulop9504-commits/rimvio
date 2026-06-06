"use client";

import dynamic from "next/dynamic";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { FeedPlanStack } from "@/components/feed/feed-plan-stack";
import { FeedExperienceAxisStrip } from "@/components/feed/feed-experience-axis-strip";
import { FeedWeatherPrepStrip } from "@/components/feed/feed-weather-prep-strip";
import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import {
  deriveExperienceFeedContext,
  resolveExperienceVolumeForSlot,
} from "@/lib/feed/project-experience-feed-labels";
import { FeedSlotPeerChipStrip } from "@/components/feed/feed-slot-peer-chip";
import { openSpawnAction } from "@/lib/action-spawn/open-spawn-action";
import { surfaceTypeVisual } from "@/lib/feed/surface-type-visual";
import { surfaceTypeAccent } from "@/lib/feed/surface-type-accent";
import {
  deriveCalendarSlotHeadline,
} from "@/lib/feed/build-feed-today-slots";
import {
  deriveSurfaceSlotTimeLabel,
} from "@/lib/feed/derive-slot-time-label";
import {
  buildPlanStackProjection,
  shouldShowPlanStack,
} from "@/lib/plan-context/build-plan-stack-projection";
import {
  derivePlanAwareSlotContext,
  derivePlanAwareSlotTimeLabel,
  resolvePlanContextForCalendarRow,
} from "@/lib/plan-context/project-plan-to-feed-slot";
import type { PlanStackLeg } from "@/lib/plan-context/plan-stack-types";
import type { PlanWeatherFeedSnapshot } from "@/hooks/use-feed-plan-weather";
import type { TrafficContext } from "@/lib/context-resolver/types";
import { resolveFeedSlotTypePrepLine } from "@/lib/feed/resolve-feed-slot-type-prep-line";
import { resolveFeedSlotWeatherTarget } from "@/lib/feed/resolve-feed-slot-weather-target";
import { experienceEventTypeById } from "@/lib/experience-graph/experience-event-type-spec";
import { planWeatherTargetKey } from "@/lib/plan-context/resolve-plan-weather-target";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  deriveFeedSlotContext,
  deriveFeedSlotHeadline,
} from "@/lib/feed/derive-feed-slot-display";
import { hasPendingFeedCaptureVerify } from "@/lib/feed/feed-capture-metadata";
import { buildFeedTimelineAggregate } from "@/lib/feed/build-feed-timeline-aggregate";
import { FeedCaptureVerifyChip } from "@/components/feed/feed-capture-verify-chip";
import { FeedTimelineAggregateStrip } from "@/components/feed/feed-timeline-aggregate-strip";
import type { GpsPing } from "@/lib/location-ping/types";
import { resolveFeedSlotPills } from "@/lib/feed/resolve-feed-slot-pills";
import { resolveFeedSlotPeerContexts } from "@/lib/feed/resolve-feed-slot-peer-context";
import type { FeedSlotPill } from "@/lib/feed/feed-slot-pill-types";
import type { FeedSlotPeerContext, FeedSlotPeerLookup } from "@/lib/feed/feed-slot-peer-context-types";
import type { FeedTodaySlot } from "@/lib/feed/feed-today-slot-types";
import {
  isGlobeRecallEligible,
  resolveGlobeRecallPlaceHint,
} from "@/lib/feed/resolve-globe-recall-eligibility";
import { cn } from "@/lib/utils";
import type { SurfaceType } from "@/lib/surface-engine/surface-contract";

const FeedExperienceSyncSheet = dynamic(
  () =>
    import("@/components/feed/feed-experience-sync-sheet").then(
      (mod) => mod.FeedExperienceSyncSheet,
    ),
  { ssr: false },
);

function SlotRowBody({
  emoji,
  type,
  timeLabel,
  headline,
  context,
  peers,
  onPeerPress,
}: {
  emoji: string;
  type: SurfaceType;
  timeLabel: string;
  headline: string;
  context: string | null;
  peers: readonly FeedSlotPeerContext[];
  onPeerPress?: (peer: FeedSlotPeerContext) => void;
}) {
  return (
    <>
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl text-[1.15rem] ring-1 ring-inset",
          surfaceTypeAccent(type),
        )}
        aria-hidden
      >
        {emoji}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium tabular-nums text-white/40">{timeLabel}</p>
        <h3 className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-white">
          {headline}
        </h3>
        {context ? (
          <p className="mt-0.5 line-clamp-1 text-[12px] text-white/44">{context}</p>
        ) : null}
      </div>

      {peers.length > 0 && onPeerPress ? (
        <FeedSlotPeerChipStrip peers={peers} onPress={onPeerPress} />
      ) : null}
    </>
  );
}

export type FeedTodaySlotCardProps = {
  slot: FeedTodaySlot;
  peerLookup: FeedSlotPeerLookup;
  eventsById?: ReadonlyMap<string, EventCandidate>;
  trafficByDestination?: ReadonlyMap<string, TrafficContext>;
  weatherByTarget?: ReadonlyMap<string, PlanWeatherFeedSnapshot>;
  volumesByEventId?: ReadonlyMap<string, ExperienceVolume>;
  onPillPress: (slot: FeedTodaySlot, pill: FeedSlotPill) => void;
  onPeerPress?: (slot: FeedTodaySlot, peer: FeedSlotPeerContext) => void;
  onOpenDetail?: (slot: FeedTodaySlot) => void;
  onSpawnPrompt?: (uri: string) => void;
  onVerifyCapture?: (eventId: string) => void;
  gpsPings?: readonly GpsPing[];
  recallEventId?: string | null;
  className?: string;
};

export const FeedTodaySlotCard = memo(function FeedTodaySlotCard({
  slot,
  peerLookup,
  eventsById,
  trafficByDestination,
  weatherByTarget,
  volumesByEventId,
  onPillPress,
  onPeerPress,
  onOpenDetail,
  onSpawnPrompt,
  onVerifyCapture,
  gpsPings = [],
  recallEventId,
  className,
}: FeedTodaySlotCardProps) {
  const type = slot.kind === "surface" ? slot.surface.type : slot.slotType;
  const visual = surfaceTypeVisual(type);

  const planContext =
    slot.kind === "calendar" && eventsById
      ? resolvePlanContextForCalendarRow(slot.row, eventsById)
      : null;

  const headline =
    slot.kind === "surface"
      ? deriveFeedSlotHeadline(slot.surface)
      : deriveCalendarSlotHeadline(slot.row);
  const weatherSnapshot = useMemo(() => {
    const target = resolveFeedSlotWeatherTarget(slot, eventsById);
    return target ? weatherByTarget?.get(planWeatherTargetKey(target)) : undefined;
  }, [slot, eventsById, weatherByTarget]);

  const experienceVolume = useMemo(
    () => resolveExperienceVolumeForSlot(slot, volumesByEventId, eventsById),
    [slot, volumesByEventId, eventsById],
  );

  const recallPlaceHint = useMemo(
    () => resolveGlobeRecallPlaceHint(slot, eventsById),
    [slot, eventsById],
  );

  const recallEligible = useMemo(
    () =>
      isGlobeRecallEligible({
        volume: experienceVolume,
        placeHint: recallPlaceHint,
      }),
    [experienceVolume, recallPlaceHint],
  );

  const [experiencePlayerOpen, setExperiencePlayerOpen] = useState(false);
  const openExperiencePlayer = useCallback(() => {
    if (recallEligible && experienceVolume) {
      setExperiencePlayerOpen(true);
    }
  }, [experienceVolume, recallEligible]);
  const closeExperiencePlayer = useCallback(() => {
    setExperiencePlayerOpen(false);
  }, []);

  useEffect(() => {
    const targetId = recallEventId?.trim();
    if (!targetId || !experienceVolume || !recallEligible) {
      return;
    }
    if (experienceVolume.sourceEventId === targetId) {
      setExperiencePlayerOpen(true);
    }
  }, [recallEventId, experienceVolume, recallEligible]);

  const handleOpenDetail = useCallback(() => {
    if (recallEligible && experienceVolume) {
      setExperiencePlayerOpen(true);
      return;
    }
    onOpenDetail?.(slot);
  }, [recallEligible, experienceVolume, onOpenDetail, slot]);

  const baseContext =
    slot.kind === "surface"
      ? deriveFeedSlotContext(slot.surface)
      : derivePlanAwareSlotContext(slot.row, planContext);

  const experienceContext = deriveExperienceFeedContext(
    slot,
    experienceVolume,
    eventsById,
  );

  const slotEvent =
    slot.kind === "calendar"
      ? (slot.row.event.eventId && eventsById
          ? eventsById.get(slot.row.event.eventId) ?? null
          : null)
      : (slot.surface.events[0]?.eventId && eventsById
          ? eventsById.get(slot.surface.events[0].eventId) ?? null
          : null);
  const peers = resolveFeedSlotPeerContexts(slot, peerLookup);
  const capturePendingVerify = hasPendingFeedCaptureVerify(slotEvent);
  const timelineAggregate = useMemo(
    () =>
      buildFeedTimelineAggregate({
        event: slotEvent,
        plan: planContext,
        peers,
        gpsPings,
      }),
    [slotEvent, planContext, peers, gpsPings],
  );
  const mergedContext = [
    capturePendingVerify ? "자동으로 붙었어요" : null,
    experienceContext ?? baseContext,
  ]
    .filter((line): line is string => Boolean(line?.trim()))
    .join(" · ");
  const context = mergedContext || null;
  const timeLabel =
    slot.kind === "surface"
      ? deriveSurfaceSlotTimeLabel(slot.surface) ?? visual.chipLabel
      : derivePlanAwareSlotTimeLabel(slot.row, planContext);

  const pills = resolveFeedSlotPills(slot);

  const handlePeerPress = onPeerPress
    ? (peer: FeedSlotPeerContext) => onPeerPress(slot, peer)
    : undefined;

  const liveTraffic = useMemo(() => {
    if (!planContext || slot.kind !== "calendar") {
      return undefined;
    }
    const destination = planContext.place?.trim() || slot.row.event.title.trim();
    return destination ? trafficByDestination?.get(destination) : undefined;
  }, [planContext, slot, trafficByDestination]);

  const planStack = useMemo(() => {
    if (!planContext || slot.kind !== "calendar" || !shouldShowPlanStack(planContext)) {
      return null;
    }
    return buildPlanStackProjection({
      plan: planContext,
      row: slot.row,
      traffic: liveTraffic,
      weather: weatherSnapshot?.weather ?? undefined,
    });
  }, [planContext, slot, liveTraffic, weatherSnapshot?.weather]);

  const onStackLegPress = useCallback(
    (leg: PlanStackLeg) => {
      if (slot.kind !== "calendar") {
        return;
      }
      if (leg.deeplink?.trim()) {
        openSpawnAction({ deeplink: leg.deeplink, onPrompt: onSpawnPrompt });
        return;
      }
      if (!leg.overlayActionId) {
        return;
      }
      const action = slot.row.overlayActions.find((row) => row.id === leg.overlayActionId);
      if (!action?.deeplink?.trim()) {
        return;
      }
      openSpawnAction({ deeplink: action.deeplink, onPrompt: onSpawnPrompt });
    },
    [slot, onSpawnPrompt],
  );

  const row = (
    <SlotRowBody
      emoji={visual.emoji}
      type={type}
      timeLabel={timeLabel}
      headline={headline}
      context={context}
      peers={peers}
      onPeerPress={handlePeerPress}
    />
  );

  const typePrepLine = useMemo(
    () => resolveFeedSlotTypePrepLine(slot, eventsById),
    [slot, eventsById],
  );

  const weatherPrepLine = weatherSnapshot?.prepLine?.trim() || null;
  const prepLine = weatherPrepLine ?? typePrepLine;
  const typePrepEmoji = useMemo(() => {
    if (weatherPrepLine || !experienceVolume) {
      return undefined;
    }
    return experienceEventTypeById(experienceVolume.eventType).emoji;
  }, [weatherPrepLine, experienceVolume]);

  const mainBlock = (
    <>
      {onOpenDetail || recallEligible ? (
        <button
          type="button"
          className="flex w-full items-start gap-3 text-left"
          onClick={handleOpenDetail}
        >
          {row}
        </button>
      ) : (
        <div className="flex w-full items-start gap-3">{row}</div>
      )}

      {timelineAggregate.hasContent ? (
        <div className="mt-2 pl-[3.25rem]">
          <FeedTimelineAggregateStrip aggregate={timelineAggregate} />
        </div>
      ) : null}

      {capturePendingVerify && slotEvent && onVerifyCapture ? (
        <div className="mt-2 pl-[3.25rem]">
          <FeedCaptureVerifyChip
            event={slotEvent}
            onVerify={() => onVerifyCapture(slotEvent.id)}
          />
        </div>
      ) : null}

      {pills.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5 pl-[3.25rem]">
          {pills.map((pill) => (
            <button
              key={pill.id}
              type="button"
              data-feed-slot-pill
              data-feed-slot-pill-kind={pill.kind}
              data-deeplink={pill.kind === "deeplink" ? pill.deeplink : undefined}
              className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-semibold text-white/82 transition-colors hover:bg-white/[0.11] active:scale-[0.98]"
              onClick={() => onPillPress(slot, pill)}
            >
              {pill.label}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );

  return (
    <article
      className={cn("py-3.5", className)}
      data-feed-today-slot
      data-feed-today-slot-kind={slot.kind}
      data-surface-id={slot.kind === "surface" ? slot.surface.id : undefined}
      data-calendar-row-id={slot.kind === "calendar" ? slot.row.id : undefined}
      data-feed-peer-count={peers.length}
      data-feed-plan-stack={planStack ? "true" : undefined}
      data-feed-weather-prep={weatherPrepLine ? "true" : undefined}
      data-feed-type-prep={!weatherPrepLine && typePrepLine ? "true" : undefined}
      data-experience-volume-id={experienceVolume?.id}
    >
      {recallEligible && experienceVolume ? (
        <FeedExperienceAxisStrip
          volume={experienceVolume}
          onOpenPlayer={openExperiencePlayer}
          className="mb-2"
        />
      ) : null}

      {prepLine ? (
        <FeedWeatherPrepStrip
          prepLine={prepLine}
          condition={weatherSnapshot?.weather?.condition}
          leadingEmoji={typePrepEmoji}
          className="mb-2"
        />
      ) : null}

      {planStack ? (
        <FeedPlanStack
          before={planStack.before}
          after={planStack.after}
          onLegPress={onStackLegPress}
        >
          {mainBlock}
        </FeedPlanStack>
      ) : (
        mainBlock
      )}

      <FeedExperienceSyncSheet
        open={experiencePlayerOpen}
        volume={experienceVolume}
        onClose={closeExperiencePlayer}
      />
    </article>
  );
});
