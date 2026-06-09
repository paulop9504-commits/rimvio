"use client";

import { useEffect, useRef, useState } from "react";
import { resolvePlaceLabelNearCoords } from "@/lib/location-ping/format-place-label";
import {
  GPS_PINGS_UPDATED,
  appendGpsPing,
  listRecentGpsPings,
} from "@/lib/location-ping/gps-ping-store";
import {
  GPS_TRACKING_UPDATED,
  isGpsTrackingEnabled,
} from "@/lib/location-ping/gps-tracking-settings";
import {
  projectLiveLocationSnapshot,
  type LiveLocationSnapshot,
} from "@/lib/location-ping/project-live-location-snapshot";

const LIVE_APPEND_MIN_MS = 45_000;

function formatTimeLabel(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return "지금";
  }
  return new Date(ms).toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** High-accuracy watch + ring-buffer context for Globe live strip. */
export function useLiveLocationSnapshot(): LiveLocationSnapshot | null {
  const [snapshot, setSnapshot] = useState<LiveLocationSnapshot | null>(null);
  const lastAppendRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let watchId: number | null = null;

    const publishFromCoords = async (input: {
      lat: number;
      lng: number;
      accuracyM: number | null;
      capturedAtIso: string;
    }) => {
      const pings = await listRecentGpsPings();
      const context = projectLiveLocationSnapshot(pings, Date.now());
      const next: LiveLocationSnapshot = {
        lat: input.lat,
        lng: input.lng,
        accuracyM: input.accuracyM,
        capturedAtIso: input.capturedAtIso,
        placeLabel: resolvePlaceLabelNearCoords(input.lat, input.lng),
        contextLabel: context?.contextLabel ?? "현재 위치",
        timeLabel: formatTimeLabel(input.capturedAtIso),
      };
      if (!cancelled) {
        setSnapshot(next);
      }
    };

    const refreshFromStore = async () => {
      if (!isGpsTrackingEnabled()) {
        if (!cancelled) {
          setSnapshot(null);
        }
        return;
      }
      const pings = await listRecentGpsPings();
      const next = projectLiveLocationSnapshot(pings);
      if (!cancelled) {
        setSnapshot(next);
      }
    };

    const startWatch = () => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        void refreshFromStore();
        return;
      }

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const accuracyM = position.coords.accuracy;
          const capturedAtIso = new Date(position.timestamp).toISOString();
          void publishFromCoords({ lat, lng, accuracyM, capturedAtIso });

          const now = Date.now();
          if (now - lastAppendRef.current >= LIVE_APPEND_MIN_MS) {
            lastAppendRef.current = now;
            void appendGpsPing({
              lat,
              lng,
              accuracyM,
              source: "foreground",
            });
          }
        },
        () => {
          void refreshFromStore();
        },
        {
          enableHighAccuracy: true,
          maximumAge: 4_000,
          timeout: 18_000,
        },
      );
    };

    const stopWatch = () => {
      if (watchId != null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    };

    const syncTracking = () => {
      stopWatch();
      if (!isGpsTrackingEnabled()) {
        setSnapshot(null);
        return;
      }
      startWatch();
    };

    syncTracking();
    window.addEventListener(GPS_TRACKING_UPDATED, syncTracking);
    window.addEventListener(GPS_PINGS_UPDATED, refreshFromStore);

    return () => {
      cancelled = true;
      stopWatch();
      window.removeEventListener(GPS_TRACKING_UPDATED, syncTracking);
      window.removeEventListener(GPS_PINGS_UPDATED, refreshFromStore);
    };
  }, []);

  return snapshot;
}
