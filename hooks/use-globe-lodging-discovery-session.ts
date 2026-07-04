"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import {
  dispatchGlobeLodgingDiscoveryClose,
  dispatchGlobeLodgingDiscoveryReveal,
  subscribeGlobeLodgingDiscoveryClose,
  subscribeGlobeLodgingDiscoverySession,
} from "@/lib/globe/lodging/globe-lodging-discovery-bridge";
import { subscribeGlobeLodgingFocus } from "@/lib/globe/context-hub/globe-lodging-marker-bridge";
import { LODGING_DISCOVERY_RELOCATE_M } from "@/lib/globe/lodging/lodging-discovery-constants";
import { computeLodgingDiscoveryBounds } from "@/lib/globe/lodging/compute-lodging-discovery-bounds";
import {
  type GlobeLodgingDiscoverySession,
} from "@/lib/globe/lodging/project-lodging-discovery-session";
import { runGlobeLodgingDiscovery } from "@/lib/globe/lodging/run-globe-lodging-discovery";
import {
  applyLodgingReactiveDiscoverySession,
  buildLodgingReactiveDiscoveryRefinement,
  buildLodgingReactiveDiscoveryRouteRequest,
  type ReactiveDiscoveryRefinement,
} from "@/lib/globe/discovery/live-discovery-reactive";

function flyGlobeToLodgingDiscoverySession(
  globeRef: RefObject<RimvioGlobeHubHandle | null> | undefined,
  next: GlobeLodgingDiscoverySession,
) {
  const bounds = computeLodgingDiscoveryBounds({
    user:
      next.userLat != null && next.userLng != null
        ? { lat: next.userLat, lng: next.userLng }
        : null,
    lodging: next.items.map((item) => ({ lat: item.lat, lng: item.lng })),
    radiusM: next.radiusM,
  });
  if (bounds) {
    globeRef?.current?.flyToDiscoveryBounds({
      centerLat: bounds.centerLat,
      centerLng: bounds.centerLng,
      altitude: bounds.altitude,
      pinViewportY: 0.62,
    });
  }
}

function isReactiveDiscoveryRefinement(value: unknown): value is ReactiveDiscoveryRefinement {
  if (!value || typeof value !== "object") {
    return false;
  }
  const detail = value as Partial<ReactiveDiscoveryRefinement>;
  return (
    (detail.source === "rules" || detail.source === "llm") &&
    Array.isArray(detail.relatedResourceIds) &&
    Array.isArray(detail.signalChips)
  );
}

export function useGlobeLodgingDiscoverySession(input: {
  globeRef?: RefObject<RimvioGlobeHubHandle | null>;
  userLat?: number | null;
  userLng?: number | null;
  contextEventId?: string | null;
}) {
  const [baseSession, setBaseSession] = useState<GlobeLodgingDiscoverySession | null>(null);
  const [selectedProjectedResourceId, setSelectedProjectedResourceId] = useState<string | null>(null);
  const [reactiveRefinement, setReactiveRefinement] =
    useState<ReactiveDiscoveryRefinement | null>(null);
  const lastFetchRef = useRef<{ lat: number; lng: number } | null>(null);
  const refreshBusyRef = useRef(false);
  const messageRef = useRef("숙소 찾기");

  useEffect(() => {
    return subscribeGlobeLodgingDiscoverySession((detail) => {
      setBaseSession(detail);
      setReactiveRefinement(null);
      messageRef.current = "숙소 찾기";
      if (detail.userLat != null && detail.userLng != null) {
        lastFetchRef.current = { lat: detail.userLat, lng: detail.userLng };
      }
      flyGlobeToLodgingDiscoverySession(input.globeRef, detail);
    });
  }, [input.globeRef]);

  useEffect(() => {
    return subscribeGlobeLodgingDiscoveryClose(() => {
      setBaseSession(null);
      setSelectedProjectedResourceId(null);
      setReactiveRefinement(null);
      lastFetchRef.current = null;
      input.globeRef?.current?.clearPinViewportBias();
    });
  }, [input.globeRef]);

  const projectedResourceId = useMemo(() => {
    if (!baseSession) {
      return null;
    }
    if (
      selectedProjectedResourceId &&
      baseSession.items.some((item) => item.resourceId === selectedProjectedResourceId)
    ) {
      return selectedProjectedResourceId;
    }
    return baseSession.items[0]?.resourceId ?? null;
  }, [baseSession, selectedProjectedResourceId]);

  useEffect(() => {
    if (!baseSession) {
      return;
    }
    return subscribeGlobeLodgingFocus((detail) => {
      if (!baseSession.items.some((item) => item.resourceId === detail.resourceId)) {
        return;
      }
      setSelectedProjectedResourceId(detail.resourceId);
      setReactiveRefinement(null);
    });
  }, [baseSession]);

  useEffect(() => {
    const session = baseSession;
    const resourceId = projectedResourceId?.trim() ?? null;
    if (!session || !resourceId) {
      return;
    }
    const baseRefinement = buildLodgingReactiveDiscoveryRefinement({
      items: session.items,
      projectedResourceId: resourceId,
      matchedPersonName: session.matchedPersonName,
    });
    const revealIds = [resourceId, ...baseRefinement.relatedResourceIds].slice(0, 4);
    revealIds.forEach((nextResourceId, index) => {
      dispatchGlobeLodgingDiscoveryReveal({
        eventId: session.eventId,
        resourceId: nextResourceId,
        index,
        total: revealIds.length,
      });
    });

    const event = findLifeEventCandidate(session.eventId);
    const controller = new AbortController();
    const body = buildLodgingReactiveDiscoveryRouteRequest({
      session,
      projectedResourceId: resourceId,
      contextEvent: {
        id: session.eventId,
        title: event?.title?.trim() || session.areaLabel,
        place: event?.place?.trim() ?? session.areaLabel,
      },
    });
    void fetch("/api/globe/discovery-related", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return (await response.json()) as unknown;
      })
      .then((detail) => {
        if (!detail || controller.signal.aborted || !isReactiveDiscoveryRefinement(detail)) {
          return;
        }
        setReactiveRefinement(detail);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [baseSession, projectedResourceId]);

  useEffect(() => {
    if (!baseSession?.eventId || input.userLat == null || input.userLng == null) {
      return;
    }
    const prev = lastFetchRef.current;
    if (!prev) {
      lastFetchRef.current = { lat: input.userLat, lng: input.userLng };
      return;
    }
    const movedM = haversineKm(prev.lat, prev.lng, input.userLat, input.userLng) * 1000;
    if (movedM < LODGING_DISCOVERY_RELOCATE_M || refreshBusyRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (refreshBusyRef.current) {
        return;
      }
      refreshBusyRef.current = true;
      setBaseSession((current) =>
        current ? { ...current, searching: true, userLat: input.userLat!, userLng: input.userLng! } : current,
      );
      void runGlobeLodgingDiscovery({
        message: messageRef.current,
        contextEventId: baseSession.eventId,
        lat: input.userLat,
        lng: input.userLng,
        searching: false,
        radiusM: baseSession.radiusM,
      })
        .then((outcome) => {
          if (outcome?.session) {
            setBaseSession(outcome.session);
            setReactiveRefinement(null);
            lastFetchRef.current = { lat: input.userLat!, lng: input.userLng! };
            if (outcome.bounds) {
              input.globeRef?.current?.flyToDiscoveryBounds({
                centerLat: outcome.bounds.centerLat,
                centerLng: outcome.bounds.centerLng,
                altitude: outcome.bounds.altitude,
                pinViewportY: 0.62,
              });
            }
          }
        })
        .finally(() => {
          refreshBusyRef.current = false;
        });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [input.globeRef, input.userLat, input.userLng, baseSession?.eventId, baseSession?.radiusM]);

  const dismiss = useCallback(() => {
    dispatchGlobeLodgingDiscoveryClose();
    setBaseSession(null);
    setSelectedProjectedResourceId(null);
    setReactiveRefinement(null);
  }, []);

  const session = useMemo(
    () =>
      baseSession
        ? applyLodgingReactiveDiscoverySession({
            session: baseSession,
            projectedResourceId,
            refinement: reactiveRefinement,
          })
        : null,
    [baseSession, projectedResourceId, reactiveRefinement],
  );

  const cardByResourceId = session
    ? Object.fromEntries(session.items.map((item) => [item.resourceId, item]))
    : null;

  const areaLabel =
    session?.areaLabel ??
    (input.contextEventId
      ? findLifeEventCandidate(input.contextEventId)?.place?.trim() ?? null
      : null);

  return {
    session,
    cardByResourceId,
    areaLabel,
    dismiss,
    isOpen: session != null,
    projectedResourceId,
    reactiveSource: projectedResourceId ? reactiveRefinement?.source ?? "rules" : null,
  };
}
