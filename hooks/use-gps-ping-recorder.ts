"use client";

import { useEffect } from "react";
import { GPS_PING_INTERVAL_MS } from "@/lib/location-ping/constants";
import {
  appendGpsPing,
  hydrateGpsPingStore,
} from "@/lib/location-ping/gps-ping-store";

function sampleGpsPing(source: "periodic" | "foreground") {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      void appendGpsPing({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracyM: position.coords.accuracy,
        source,
      });
    },
    () => {
      // Permission denied or unavailable — stay silent.
    },
    {
      enableHighAccuracy: false,
      maximumAge: GPS_PING_INTERVAL_MS,
      timeout: 12_000,
    },
  );
}

/** Background GPS ring buffer — e.g. one ping every 3 minutes while Rimvio is open. */
export function useGpsPingRecorder(enabled = true) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    void hydrateGpsPingStore().then(() => {
      sampleGpsPing("foreground");
    });

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }
      sampleGpsPing("periodic");
    }, GPS_PING_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        sampleGpsPing("foreground");
      }
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled]);
}
