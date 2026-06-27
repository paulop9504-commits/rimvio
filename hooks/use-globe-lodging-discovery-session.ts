"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import {
  dispatchGlobeLodgingDiscoveryClose,
  subscribeGlobeLodgingDiscoveryClose,
  subscribeGlobeLodgingDiscoverySession,
} from "@/lib/globe/lodging/globe-lodging-discovery-bridge";
import { LODGING_DISCOVERY_RELOCATE_M } from "@/lib/globe/lodging/lodging-discovery-constants";
import { computeLodgingDiscoveryBounds } from "@/lib/globe/lodging/compute-lodging-discovery-bounds";
import {
  type GlobeLodgingDiscoverySession,
} from "@/lib/globe/lodging/project-lodging-discovery-session";
import { runGlobeLodgingDiscovery } from "@/lib/globe/lodging/run-globe-lodging-discovery";

export function useGlobeLodgingDiscoverySession(input: {
  globeRef?: RefObject<RimvioGlobeHubHandle | null>;
  userLat?: number | null;
  userLng?: number | null;
  contextEventId?: string | null;
}) {
  const [session, setSession] = useState<GlobeLodgingDiscoverySession | null>(null);
  const lastFetchRef = useRef<{ lat: number; lng: number } | null>(null);
  const refreshBusyRef = useRef(false);
  const messageRef = useRef("숙소 찾기");

  const flyToSession = useCallback(
    (next: GlobeLodgingDiscoverySession) => {
      const bounds = computeLodgingDiscoveryBounds({
        user:
          next.userLat != null && next.userLng != null
            ? { lat: next.userLat, lng: next.userLng }
            : null,
        lodging: next.items.map((item) => ({ lat: item.lat, lng: item.lng })),
        radiusM: next.radiusM,
      });
      if (bounds) {
        input.globeRef?.current?.flyToDiscoveryBounds({
          centerLat: bounds.centerLat,
          centerLng: bounds.centerLng,
          altitude: bounds.altitude,
          pinViewportY: 0.62,
        });
      }
    },
    [input.globeRef],
  );

  useEffect(() => {
    return subscribeGlobeLodgingDiscoverySession((detail) => {
      setSession(detail);
      messageRef.current = "숙소 찾기";
      if (detail.userLat != null && detail.userLng != null) {
        lastFetchRef.current = { lat: detail.userLat, lng: detail.userLng };
      }
      flyToSession(detail);
    });
  }, [flyToSession]);

  useEffect(() => {
    return subscribeGlobeLodgingDiscoveryClose(() => {
      setSession(null);
      lastFetchRef.current = null;
      input.globeRef?.current?.clearPinViewportBias();
    });
  }, [input.globeRef]);

  useEffect(() => {
    if (!session?.eventId || input.userLat == null || input.userLng == null) {
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
      setSession((current) =>
        current ? { ...current, searching: true, userLat: input.userLat!, userLng: input.userLng! } : current,
      );
      void runGlobeLodgingDiscovery({
        message: messageRef.current,
        contextEventId: session.eventId,
        lat: input.userLat,
        lng: input.userLng,
        searching: false,
        radiusM: session.radiusM,
      })
        .then((outcome) => {
          if (outcome?.session) {
            setSession(outcome.session);
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
  }, [input.globeRef, input.userLat, input.userLng, session?.eventId, session?.radiusM]);

  const dismiss = useCallback(() => {
    dispatchGlobeLodgingDiscoveryClose();
    setSession(null);
  }, []);

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
  };
}
