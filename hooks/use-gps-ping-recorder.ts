"use client";

import { useEffect, useRef } from "react";
import {
  GPS_BURST_FOREGROUND_STALE_MS,
  GPS_BURST_MOVEMENT_INTERVAL_MS,
  GPS_BURST_MOVEMENT_SESSION_MS,
  GPS_BURST_MOVEMENT_STEP_KM,
  GPS_PING_INTERVAL_DWELL_MS,
  GPS_PING_INTERVAL_MS,
} from "@/lib/location-ping/constants";
import { requestGpsBurst } from "@/lib/location-ping/gps-burst-sample";
import {
  GPS_PINGS_UPDATED,
  hydrateGpsPingStore,
  listRecentGpsPings,
} from "@/lib/location-ping/gps-ping-store";
import { haversineKm } from "@/lib/feed/spacetime-fit";

function isDwelling(pings: readonly { lat: number; lng: number }[]): boolean {
  if (pings.length < 3) {
    return false;
  }
  const recent = pings.slice(-3);
  const centerLat = recent.reduce((sum, row) => sum + row.lat, 0) / recent.length;
  const centerLng = recent.reduce((sum, row) => sum + row.lng, 0) / recent.length;
  return recent.every((row) => {
    const dLat = ((row.lat - centerLat) * Math.PI) / 180;
    const dLng = ((row.lng - centerLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((centerLat * Math.PI) / 180) *
        Math.cos((row.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <= 0.35;
  });
}

function detectMovementStepKm(
  pings: readonly { lat: number; lng: number }[],
): number | null {
  if (pings.length < 2) {
    return null;
  }
  const prev = pings[pings.length - 2]!;
  const last = pings[pings.length - 1]!;
  return haversineKm(prev.lat, prev.lng, last.lat, last.lng);
}

async function resolveBurstIntervalMs(movementSessionUntilMs: number): Promise<number> {
  if (Date.now() < movementSessionUntilMs) {
    return GPS_BURST_MOVEMENT_INTERVAL_MS;
  }
  const pings = await listRecentGpsPings();
  if (pings.length < 2) {
    return GPS_PING_INTERVAL_MS;
  }
  const stepKm = detectMovementStepKm(pings);
  if (stepKm !== null && stepKm >= GPS_BURST_MOVEMENT_STEP_KM) {
    return GPS_BURST_MOVEMENT_INTERVAL_MS;
  }
  return isDwelling(pings) ? GPS_PING_INTERVAL_DWELL_MS : GPS_PING_INTERVAL_MS;
}

async function latestPingAgeMs(): Promise<number | null> {
  const pings = await listRecentGpsPings();
  const latest = pings[pings.length - 1];
  if (!latest) {
    return null;
  }
  const ms = Date.parse(latest.capturedAtIso);
  if (Number.isNaN(ms)) {
    return null;
  }
  return Date.now() - ms;
}

/** Passive GPS burst scheduler — no continuous watchPosition. */
export function useGpsPingRecorder(enabled = true) {
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const movementSessionUntilRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    const maybeExtendMovementSession = async () => {
      const pings = await listRecentGpsPings();
      const stepKm = detectMovementStepKm(pings);
      if (stepKm !== null && stepKm >= GPS_BURST_MOVEMENT_STEP_KM) {
        movementSessionUntilRef.current =
          Date.now() + GPS_BURST_MOVEMENT_SESSION_MS;
      }
    };

    const runScheduledBurst = async () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      await requestGpsBurst({ reason: "periodic", tier: "passive" });
    };

    const runForegroundBurst = async () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      const ageMs = await latestPingAgeMs();
      if (ageMs !== null && ageMs < GPS_BURST_FOREGROUND_STALE_MS) {
        return;
      }
      await requestGpsBurst({ reason: "foreground", tier: "passive" });
    };

    const rearm = async () => {
      const intervalMs = await resolveBurstIntervalMs(
        movementSessionUntilRef.current,
      );
      if (cancelled) {
        return;
      }
      if (intervalIdRef.current != null) {
        clearInterval(intervalIdRef.current);
      }
      intervalIdRef.current = window.setInterval(() => {
        void runScheduledBurst();
      }, intervalMs);
    };

    void hydrateGpsPingStore().then(async () => {
      await runForegroundBurst();
      await maybeExtendMovementSession();
      void rearm();
    });

    const onPingsUpdated = () => {
      void maybeExtendMovementSession().then(() => rearm());
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void runForegroundBurst();
      }
    };

    window.addEventListener(GPS_PINGS_UPDATED, onPingsUpdated);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (intervalIdRef.current != null) {
        clearInterval(intervalIdRef.current);
      }
      window.removeEventListener(GPS_PINGS_UPDATED, onPingsUpdated);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled]);
}
