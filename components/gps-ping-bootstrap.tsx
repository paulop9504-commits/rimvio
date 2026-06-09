"use client";

import { useEffect } from "react";
import { useGpsBackgroundEventIngest } from "@/hooks/use-gps-background-event-ingest";
import { useGpsPingRecorder } from "@/hooks/use-gps-ping-recorder";
import { useGpsTrackingEnabled } from "@/hooks/use-gps-tracking-enabled";
import { hydrateGpsPingStore } from "@/lib/location-ping/gps-ping-store";
import { hydrateMediaContextStore } from "@/lib/location-ping/media-context-store";

/** Starts periodic GPS pings and hydrates local spacetime stores. */
export function GpsPingBootstrap() {
  const { enabled } = useGpsTrackingEnabled();
  useGpsPingRecorder(enabled);
  useGpsBackgroundEventIngest(enabled);

  useEffect(() => {
    void hydrateGpsPingStore();
    void hydrateMediaContextStore();
  }, []);

  return null;
}
