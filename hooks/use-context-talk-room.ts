"use client";

import type { RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PeerMessage } from "@/lib/context/peer-message-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { fetchExperienceBridgeRemote } from "@/lib/experience-bridge/experience-bridge-client";
import { mergeBridgeTimeline } from "@/lib/experience-bridge/merge-bridge-timeline";
import {
  projectContextTalkSegments,
  resolveContextTalkSegmentForMessage,
  type ContextTalkSegment,
} from "@/lib/experience-window/project-context-talk-segments";
import { resolveExperienceWindow } from "@/lib/experience-window/resolve-experience-window";
import type { ExperienceWindow } from "@/lib/experience-window/experience-window-types";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { buildVectorMapHandoffView } from "@/lib/globe/globe-vector-map-view";
import type { GlobeVectorMapView } from "@/lib/globe/globe-vector-map-view";
import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";

export function useContextTalkRoom(input: {
  eventId: string | null;
  peerThreadId: string;
  messages: readonly PeerMessage[];
  tripTitle?: string | null;
  enabled?: boolean;
}) {
  const enabled = input.enabled ?? true;
  const [experienceWindow, setExperienceWindow] = useState<ExperienceWindow | null>(null);
  const [segments, setSegments] = useState<ContextTalkSegment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const event = useMemo(
    () => (input.eventId ? findLifeEventCandidate(input.eventId) : null),
    [input.eventId],
  );

  const refresh = useCallback(async () => {
    if (!enabled || !input.eventId?.trim()) {
      const fallbackEvent = event;
      if (!fallbackEvent) {
        setSegments([]);
        setExperienceWindow(null);
        return;
      }
      const window = resolveExperienceWindow({ event: fallbackEvent });
      setExperienceWindow(window);
      setSegments(
        projectContextTalkSegments({
          messages: input.messages,
          window,
          event: fallbackEvent,
          tripTitle: input.tripTitle,
        }),
      );
      return;
    }

    setLoading(true);
    try {
      const remote = await fetchExperienceBridgeRemote(input.eventId.trim(), {
        fresh: true,
      });
      const bridgeEvent =
        remote.state?.bridge.eventSnapshot ?? event ?? null;
      if (!bridgeEvent) {
        return;
      }
      const window =
        remote.experienceWindow ??
        resolveExperienceWindow({
          event: bridgeEvent,
          bridge: remote.state?.bridge ?? null,
        });
      const timeline = remote.timeline.length
        ? remote.timeline
        : remote.state
          ? mergeBridgeTimeline({
              bridge: remote.state.bridge,
              viewerUserId: "",
              hostDisplayName: "호스트",
              experienceWindow: window,
            })
          : [];

      const nextSegments = projectContextTalkSegments({
        messages: input.messages,
        window,
        event: bridgeEvent,
        timeline,
        tripTitle: input.tripTitle ?? bridgeEvent.title,
      });
      setExperienceWindow(window);
      setSegments(nextSegments);
      setActiveSegmentId((current) => current ?? nextSegments[0]?.id ?? null);
    } catch {
      if (event) {
        const window = resolveExperienceWindow({ event });
        setExperienceWindow(window);
        setSegments(
          projectContextTalkSegments({
            messages: input.messages,
            window,
            event,
            tripTitle: input.tripTitle,
          }),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [enabled, event, input.eventId, input.messages, input.tripTitle]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activeSegment = useMemo(
    () => segments.find((row) => row.id === activeSegmentId) ?? segments[0] ?? null,
    [activeSegmentId, segments],
  );

  const mapView: GlobeVectorMapView | null = useMemo(() => {
    if (!activeSegment) {
      return null;
    }
    return buildVectorMapHandoffView({
      lat: activeSegment.lat,
      lng: activeSegment.lng,
      zoom: 14.8,
    });
  }, [activeSegment]);

  const mapPins: ClassifiedGlobePin[] = useMemo(
    () => activeSegment?.mapPins ?? [],
    [activeSegment],
  );

  const onMessageVisible = useCallback(
    (messageId: string) => {
      const segment = resolveContextTalkSegmentForMessage(segments, messageId);
      if (segment) {
        setActiveSegmentId(segment.id);
      }
    },
    [segments],
  );

  return {
    event,
    experienceWindow,
    segments,
    activeSegment,
    activeSegmentId,
    mapView,
    mapPins,
    loading,
    refresh,
    onMessageVisible,
    setActiveSegmentId,
  };
}

export function useContextTalkScrollSync(input: {
  scrollRootRef: RefObject<HTMLElement | null>;
  enabled?: boolean;
  onMessageVisible: (messageId: string) => void;
}) {
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!input.enabled) {
      return;
    }
    const root = input.scrollRootRef.current;
    if (!root) {
      return;
    }

    const resolveVisibleMessage = () => {
      const markers = root.querySelectorAll<HTMLElement>("[data-context-talk-message]");
      if (markers.length === 0) {
        return;
      }
      const rootRect = root.getBoundingClientRect();
      const focusY = rootRect.top + rootRect.height * 0.38;

      let bestId: string | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (const el of markers) {
        const rect = el.getBoundingClientRect();
        if (rect.bottom < rootRect.top || rect.top > rootRect.bottom) {
          continue;
        }
        const mid = rect.top + rect.height * 0.5;
        const distance = Math.abs(mid - focusY);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestId = el.dataset.contextTalkMessage ?? null;
        }
      }

      if (bestId) {
        input.onMessageVisible(bestId);
      }
    };

    const onScroll = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        resolveVisibleMessage();
      });
    };

    root.addEventListener("scroll", onScroll, { passive: true });
    resolveVisibleMessage();

    return () => {
      root.removeEventListener("scroll", onScroll);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [input.enabled, input.onMessageVisible, input.scrollRootRef]);
}
