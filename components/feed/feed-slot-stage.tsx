"use client";

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
import { FeedTodaySlotsPanel } from "@/components/feed/feed-today-slots-panel";
import type { FeedSlotPeerDetailCopy } from "@/components/feed/feed-slot-peer-detail-sheet";
import { buildFeedSlotPeerLookup } from "@/lib/feed/build-feed-slot-peer-lookup";
import { buildFeedTodaySlots } from "@/lib/feed/resolve-feed-today-slots";
import { dispatchFeedSlotPill } from "@/lib/feed/dispatch-feed-slot-pill";
import { resolveFeedSlotOpenTarget } from "@/lib/feed/resolve-feed-slot-open-target";
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
  const primary = frame.layout.primary;
  const latent = frame.graph.latentSurfaces;
  const gpsPings = useFeedGpsPings();

  const [eventRevision, setEventRevision] = useState(0);
  useEffect(() => {
    ensureFeedPlanDemoEvent();
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

  const onSlotOpen = useCallback(
    (slot: FeedTodaySlot) => {
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
    [peerLookup, eventsById, onOpenPeerChat, onScrollToFeedMessage, onOpenCalendar],
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
      data-active-surface-id={frame.collapse.activeSurfaceId ?? undefined}
      data-latent-count={latent.length}
      data-today-slot-count={today.length}
      data-calendar-row-count={overlayRows.length}
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
        className="min-h-0 flex-1"
      />
    </div>
  );
});
