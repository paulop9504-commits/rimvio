"use client";

import type { GpsPing, GpsPingSource } from "@/lib/location-ping/types";
import {
  GPS_BURST_ACTIVE_DEDUPE_MS,
  GPS_BURST_PASSIVE_MIN_GAP_MS,
} from "@/lib/location-ping/constants";
import { appendGpsPing, listRecentGpsPings } from "@/lib/location-ping/gps-ping-store";

export type GpsBurstTier = "passive" | "active";

export type GpsBurstReason =
  | "foreground"
  | "periodic"
  | "upload"
  | "capture"
  | "movement"
  | "live_refresh";

type BurstOptions = {
  reason: GpsBurstReason;
  tier?: GpsBurstTier;
  /** Skip min-gap throttle (e.g. user tapped "use my location"). */
  force?: boolean;
  source?: GpsPingSource;
};

let inFlight: Promise<GpsPing | null> | null = null;
let lastBurstAtMs = 0;
let lastBurstTier: GpsBurstTier | null = null;

function tierForReason(reason: GpsBurstReason, tier?: GpsBurstTier): GpsBurstTier {
  if (tier) {
    return tier;
  }
  if (reason === "upload" || reason === "capture") {
    return "active";
  }
  return "passive";
}

function sourceForBurst(
  reason: GpsBurstReason,
  tier: GpsBurstTier,
  override?: GpsPingSource,
): GpsPingSource {
  if (override) {
    return override;
  }
  if (reason === "upload") {
    return "upload_boost";
  }
  if (tier === "active") {
    return "foreground";
  }
  return "periodic";
}

function geoOptions(tier: GpsBurstTier): PositionOptions {
  if (tier === "active") {
    return {
      enableHighAccuracy: true,
      maximumAge: 12_000,
      timeout: 12_000,
    };
  }
  return {
    enableHighAccuracy: false,
    maximumAge: 300_000,
    timeout: 20_000,
  };
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

function shouldThrottle(
  tier: GpsBurstTier,
  force: boolean,
  pingAgeMs: number | null,
  now: number,
): boolean {
  if (force) {
    return false;
  }
  if (tier === "active") {
    return (
      lastBurstTier === "active" &&
      now - lastBurstAtMs < GPS_BURST_ACTIVE_DEDUPE_MS
    );
  }
  if (pingAgeMs !== null && pingAgeMs < GPS_BURST_PASSIVE_MIN_GAP_MS) {
    return true;
  }
  return now - lastBurstAtMs < GPS_BURST_PASSIVE_MIN_GAP_MS;
}

function readPosition(tier: GpsBurstTier): Promise<GeolocationPosition | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      () => resolve(null),
      geoOptions(tier),
    );
  });
}

/** On-demand GPS sample — passive by default; active only for capture/upload. */
export async function requestGpsBurst(options: BurstOptions): Promise<GpsPing | null> {
  const tier = tierForReason(options.reason, options.tier);
  const now = Date.now();
  const pingAgeMs = await latestPingAgeMs();

  if (shouldThrottle(tier, options.force ?? false, pingAgeMs, now)) {
    return null;
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    const position = await readPosition(tier);
    if (!position) {
      return null;
    }
    const ping = await appendGpsPing({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracyM: position.coords.accuracy,
      source: sourceForBurst(options.reason, tier, options.source),
    });
    lastBurstAtMs = Date.now();
    lastBurstTier = tier;
    return ping;
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

export function resetGpsBurstSampleForTests(): void {
  inFlight = null;
  lastBurstAtMs = 0;
  lastBurstTier = null;
}
