"use client";

import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useFeedPlanTraffic } from "@/hooks/use-feed-plan-traffic";
import { useExperienceGraph } from "@/hooks/use-experience-graph";
import { useFeedPlanWeather } from "@/hooks/use-feed-plan-weather";
import { ensureFeedPlanDemoEvent } from "@/lib/feed/seed-feed-plan-demo";
import { ensureGlobeDemoEvents } from "@/lib/experience-graph/seed-globe-demo-events";
import { enrichCalendarRowWithTieredActions } from "@/lib/action-decision/build-tiered-event-overlay-actions";
import { EVENT_CANDIDATES_UPDATED, listEventCandidates } from "@/lib/events/event-store";
import {
  indexEventsById,
  resolvePlanContextForCalendarRow,
} from "@/lib/plan-context/project-plan-to-feed-slot";
import type { CapabilityId } from "@/lib/capability-registry";
import { FeedExperienceRecallHero } from "@/components/feed/feed-experience-recall-hero";
import { FeedExperienceSlotsDrawer } from "@/components/feed/feed-experience-slots-drawer";
import { FeedTodaySlotsPanel } from "@/components/feed/feed-today-slots-panel";
import type { FeedSlotPeerDetailCopy } from "@/components/feed/feed-slot-peer-detail-sheet";
import { buildFeedSlotPeerLookup } from "@/lib/feed/build-feed-slot-peer-lookup";
import { buildFeedTodaySlots } from "@/lib/feed/resolve-feed-today-slots";
import { dispatchFeedSlotPill } from "@/lib/feed/dispatch-feed-slot-pill";
import { resolveFeedSlotOpenTarget } from "@/lib/feed/resolve-feed-slot-open-target";
import {
  findFeedSlotByEventId,
  isFeedSlotRecallEligible,
  pickDefaultFeedActiveEventId,
  resolveFeedSlotRecallHeadline,
} from "@/lib/feed/resolve-feed-active-recall";
import { resolveExperienceVolumeForSlot } from "@/lib/feed/project-experience-feed-labels";
import { buildExperienceRunSearchHref } from "@/lib/feed/feed-experience-run-mentions";
import { writeFeedExperienceRunContext } from "@/lib/feed/feed-experience-run-context-store";
import { shouldDeferFeedRecommendations } from "@/lib/feed/feed-verify-recommendation-gate";
import { resolveGlobeRecallPlaceHint } from "@/lib/feed/resolve-globe-recall-eligibility";
import { useCopy } from "@/hooks/use-copy";
import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import type { FeedSlotPill } from "@/lib/feed/feed-slot-pill-types";
import type { FeedSlotPeerContext } from "@/lib/feed/feed-slot-peer-context-types";
import type { FeedTodaySlot } from "@/lib/feed/feed-today-slot-types";
import type { PeerContact } from "@/lib/context/peer-contact-types";
import type { RelationshipFeedSlot } from "@/lib/social/relationship-slot-types";
import type { UnifiedCalendarOverlayRow } from "@/lib/calendar/calendar-view-types";
import type {
  SurfaceCompositionFrame,
  SurfaceNode,
} from "@/lib/surface-composition/surface-node-contract";
import { toast } from "sonner";
import { useFeedGpsPings } from "@/hooks/use-feed-gps-pings";
import { verifyFeedCaptureEvent } from "@/lib/feed/verify-feed-capture";
import { cn } from "@/lib/utils";

export type FeedSlotStageProps = {
  frame: SurfaceCompositionFrame;
  overlayRows: readonly UnifiedCalendarOverlayRow[];
  onDispatchCapability: (
    node: SurfaceNode,
    actionId: string,
    capabilityId: CapabilityId,
  ) => void;
  onSpawnPrompt?: (uri: string) => void;
  onFireScheduledNow?: (messageId: string) => void;
  onOpenCalendar?: () => void;
  onLater?: () => void;
  messages?: readonly ActionChatMessage[];
  relationshipSlots?: readonly RelationshipFeedSlot[];
  peerDetailCopy: FeedSlotPeerDetailCopy;
  onOpenPeerChat?: (peer: FeedSlotPeerContext) => void;
  onScrollToFeedMessage?: (messageId: string) => void;
  groupRooms?: readonly { peerThreadId: string; displayName: string }[];
  peerContacts?: readonly PeerContact[];
  recallEventId?: string | null;
  className?: string;
};

function asDispatchNode(slot: FeedTodaySlot & { kind: "surface" }): SurfaceNode {
  const surface = slot.surface;
  return {
    ...surface,
    layoutSlot: "secondary",
    mfeId: "GenericSurfaceMF",
    capabilityBindings: {
      primary: surface.primaryAction?.capabilityId ?? "CALENDAR",
      secondary: surface.secondaryActions?.map((row) => row.capabilityId) ?? [],
    },
    uiComponents: [],
  };
}

export const FeedSlotStage = memo(function FeedSlotStage({
  frame,
  overlayRows,
  onDispatchCapability,
  onSpawnPrompt,
  onFireScheduledNow,
  onOpenCalendar,
  onLater,
  messages = [],
  relationshipSlots = [],
  peerDetailCopy,
  onOpenPeerChat,
  onScrollToFeedMessage,
  groupRooms = [],
  peerContacts,
  recallEventId,
  className,
}: FeedSlotStageProps) {
  const copy = useCopy();
  const router = useRouter();
  const primary = frame.layout.primary;
  const latent = frame.graph.latentSurfaces;
  const gpsPings = useFeedGpsPings();

  const [eventRevision, setEventRevision] = useState(0);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [recallExpanded, setRecallExpanded] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    ensureFeedPlanDemoEvent();
    ensureGlobeDemoEvents();
    const bump = () => setEventRevision((value) => value + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    return () => window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
  }, []);

  const eventsById = useMemo(
    () => indexEventsById(listEventCandidates()),
    [eventRevision],
  );

  const enrichedOverlayRows = useMemo(() => {
    const now = new Date();
    return overlayRows.map((row) => {
      if (!row.event.eventId) {
        return row;
      }
      const plan = resolvePlanContextForCalendarRow(row, eventsById);
      if (!plan) {
        return row;
      }
      return enrichCalendarRowWithTieredActions(row, now) ?? row;
    });
  }, [overlayRows, eventsById]);

  const { today, overflow } = useMemo(
    () =>
      buildFeedTodaySlots({
        primary,
        latent,
        overlayRows: enrichedOverlayRows,
      }),
    [primary, latent, enrichedOverlayRows],
  );

  const trafficByDestination = useFeedPlanTraffic(today, eventsById);
  const weatherByTarget = useFeedPlanWeather(today, eventsById);
  const { volumesByEventId } = useExperienceGraph(eventsById);

  const peerLookup = useMemo(
    () =>
      buildFeedSlotPeerLookup({
        messages,
        relationshipSlots,
        groupRooms,
        contacts: peerContacts,
      }),
    [messages, relationshipSlots, groupRooms, peerContacts],
  );

  useEffect(() => {
    if (initialized || today.length === 0) {
      return;
    }
    const nextId = pickDefaultFeedActiveEventId(
      today,
      volumesByEventId,
      eventsById,
      recallEventId,
    );
    setActiveEventId(nextId);
    if (recallEventId?.trim()) {
      setRecallExpanded(true);
    }
    setInitialized(true);
  }, [initialized, today, volumesByEventId, eventsById, recallEventId]);

  useEffect(() => {
    const target = recallEventId?.trim();
    if (!target) {
      return;
    }
    setActiveEventId(target);
    setRecallExpanded(true);
  }, [recallEventId]);

  const activeSlot = useMemo(
    () => findFeedSlotByEventId(today, activeEventId),
    [today, activeEventId],
  );

  const activeVolume = useMemo(() => {
    if (!activeSlot) {
      return null;
    }
    return resolveExperienceVolumeForSlot(activeSlot, volumesByEventId, eventsById);
  }, [activeSlot, volumesByEventId, eventsById]);

  const activeHeadline = useMemo(() => {
    if (!activeSlot) {
      return null;
    }
    return resolveFeedSlotRecallHeadline(activeSlot, eventsById);
  }, [activeSlot, eventsById]);

  const showRecallHero = useMemo(() => {
    if (!activeSlot) {
      return false;
    }
    return isFeedSlotRecallEligible(activeSlot, volumesByEventId, eventsById);
  }, [activeSlot, volumesByEventId, eventsById]);

  const activeEvent = activeEventId ? eventsById.get(activeEventId) : null;
  const runDeferred = shouldDeferFeedRecommendations(activeEvent);

  const onRunMention = useCallback(
    (featureId: string) => {
      if (!activeEventId) {
        return;
      }
      const event = eventsById.get(activeEventId);
      if (event && shouldDeferFeedRecommendations(event)) {
        toast.message(copy.feed.experience.verifyDeferHint, { duration: 3600 });
        return;
      }
      const place =
        (activeSlot ? resolveGlobeRecallPlaceHint(activeSlot, eventsById) : null) ??
        event?.place ??
        null;
      const headline = activeSlot
        ? resolveFeedSlotRecallHeadline(activeSlot, eventsById)
        : event?.title ?? null;
      writeFeedExperienceRunContext({
        eventId: activeEventId,
        featureId,
        place,
        headline,
      });
      router.push(
        buildExperienceRunSearchHref({
          eventId: activeEventId,
          featureId,
          place,
        }),
      );
    },
    [activeEventId, activeSlot, copy.feed.experience.verifyDeferHint, eventsById, router],
  );

  const onRunAtFromDrawer = useCallback(() => {
    if (runDeferred) {
      toast.message(copy.feed.experience.verifyDeferHint, { duration: 3600 });
      return;
    }
    if (!recallExpanded && showRecallHero) {
      setRecallExpanded(true);
      return;
    }
    onRunMention("navigate");
  }, [
    copy.feed.experience.verifyDeferHint,
    onRunMention,
    recallExpanded,
    runDeferred,
    showRecallHero,
  ]);

  const onSelectExperience = useCallback(
    (eventId: string, options?: { expand?: boolean }) => {
      setActiveEventId(eventId);
      const slot = findFeedSlotByEventId(today, eventId);
      if (
        slot &&
        isFeedSlotRecallEligible(slot, volumesByEventId, eventsById) &&
        options?.expand !== false
      ) {
        setRecallExpanded(true);
      }
    },
    [today, volumesByEventId, eventsById],
  );

  const onSlotOpen = useCallback(
    (slot: FeedTodaySlot) => {
      const eventId =
        slot.kind === "calendar"
          ? slot.row.event.eventId?.trim()
          : slot.surface.events[0]?.eventId?.trim();
      if (
        eventId &&
        isFeedSlotRecallEligible(slot, volumesByEventId, eventsById)
      ) {
        onSelectExperience(eventId, { expand: true });
        return;
      }

      const target = resolveFeedSlotOpenTarget(slot, peerLookup, eventsById);
      if (target.kind === "peer_room") {
        onOpenPeerChat?.({
          peerThreadId: target.peerThreadId,
          displayName: target.displayName ?? "친구",
          avatarUrl: null,
          rimvioId: null,
          emailLower: null,
          source: "feed_talk",
        });
        return;
      }
      if (target.kind === "feed_message" && onScrollToFeedMessage) {
        onScrollToFeedMessage(target.messageId);
        return;
      }
      onOpenCalendar?.();
    },
    [
      volumesByEventId,
      eventsById,
      onSelectExperience,
      peerLookup,
      onOpenPeerChat,
      onScrollToFeedMessage,
      onOpenCalendar,
    ],
  );

  const onVerifyCapture = useCallback((eventId: string) => {
    const result = verifyFeedCaptureEvent(eventId);
    if (!result.ok || !result.event) {
      toast.error("확정하지 못했어요");
      return;
    }
    if (result.alreadyVerified) {
      return;
    }
    toast.success(`${result.event.title} 확정했어요`);
  }, []);

  const onPillPress = useCallback(
    (slot: FeedTodaySlot, pill: FeedSlotPill) => {
      dispatchFeedSlotPill(slot, pill, {
        onSpawnPrompt,
        onLater,
        onCapability: (target, capabilityId) => {
          if (target.kind !== "surface") {
            onOpenCalendar?.();
            return;
          }
          const node = asDispatchNode(target);
          const actionId = `${node.id}:${capabilityId}`;
          onDispatchCapability(node, actionId, capabilityId);
        },
      });
    },
    [onDispatchCapability, onLater, onOpenCalendar, onSpawnPrompt],
  );

  return (
    <div
      className={cn("flex min-h-0 flex-col overflow-hidden", className)}
      data-feed-slot-stage
      data-feed-recall-layout="yt-music"
      data-active-event-id={activeEventId ?? undefined}
      data-recall-expanded={recallExpanded ? "true" : "false"}
      data-active-surface-id={frame.collapse.activeSurfaceId ?? undefined}
      data-latent-count={latent.length}
      data-today-slot-count={today.length}
      data-calendar-row-count={overlayRows.length}
    >
      {showRecallHero ? (
        <FeedExperienceRecallHero
          volume={activeVolume}
          headline={activeHeadline}
          expanded={recallExpanded}
          onToggleExpanded={() => setRecallExpanded((value) => !value)}
          runDeferred={runDeferred}
          onRunMention={onRunMention}
        />
      ) : null}

      <FeedExperienceSlotsDrawer
        collapsedSummary={activeHeadline}
        slotCount={today.length}
        runLabel={copy.feed.experience.run.at}
        runDeferred={runDeferred}
        onRunAt={activeEventId ? onRunAtFromDrawer : undefined}
        className={cn(
          "min-h-0",
          showRecallHero && recallExpanded ? "shrink-0" : "flex-1",
        )}
      >
        <FeedTodaySlotsPanel
          slots={today}
          overflowCount={overflow.length}
          peerLookup={peerLookup}
          eventsById={eventsById}
          trafficByDestination={trafficByDestination}
          weatherByTarget={weatherByTarget}
          volumesByEventId={volumesByEventId}
          peerDetailCopy={peerDetailCopy}
          onPillPress={onPillPress}
          onSpawnPrompt={onSpawnPrompt}
          onOpenPeerChat={onOpenPeerChat}
          onSlotOpen={onSlotOpen}
          onVerifyCapture={onVerifyCapture}
          gpsPings={gpsPings}
          onViewAll={onOpenCalendar}
          recallEventId={recallEventId}
          drawerMode
          activeEventId={activeEventId}
          onSelectExperience={onSelectExperience}
          inlineRecall
          className="min-h-0 flex-1"
        />
      </FeedExperienceSlotsDrawer>
    </div>
  );
});
