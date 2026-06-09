"use client";

import { useEffect, useState } from "react";
import {
  GPS_PINGS_UPDATED,
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

export function useLiveLocationSnapshot(): LiveLocationSnapshot | null {
  const [snapshot, setSnapshot] = useState<LiveLocationSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
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

    refresh();
    window.addEventListener(GPS_PINGS_UPDATED, refresh);
    window.addEventListener(GPS_TRACKING_UPDATED, refresh);
    const intervalId = window.setInterval(refresh, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener(GPS_PINGS_UPDATED, refresh);
      window.removeEventListener(GPS_TRACKING_UPDATED, refresh);
    };
  }, []);

  return snapshot;
}
