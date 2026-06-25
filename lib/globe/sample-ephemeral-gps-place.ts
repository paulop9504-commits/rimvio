"use client";

import { resolvePlaceLabelNearCoords } from "@/lib/location-ping/format-place-label";
import {
  appendGpsPing,
  hydrateGpsPingStore,
  readGpsPingMemorySnapshot,
} from "@/lib/location-ping/gps-ping-store";

export type EphemeralGpsPlaceSample = {
  lat: number;
  lng: number;
  placeLabel: string;
  accuracyM: number | null;
};

export type EphemeralGpsPlaceFailureReason =
  | "unavailable"
  | "denied"
  | "timeout"
  | "unknown";

export type EphemeralGpsPlaceResult =
  | { ok: true; sample: EphemeralGpsPlaceSample }
  | { ok: false; reason: EphemeralGpsPlaceFailureReason };

const RECENT_PING_MAX_AGE_MS = 120_000;

function toSample(position: GeolocationPosition): EphemeralGpsPlaceSample {
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  const accuracyM = Number.isFinite(position.coords.accuracy)
    ? position.coords.accuracy
    : null;
  return {
    lat,
    lng,
    placeLabel: resolvePlaceLabelNearCoords(lat, lng),
    accuracyM,
  };
}

function readRecentPingSample(): EphemeralGpsPlaceSample | null {
  const pings = readGpsPingMemorySnapshot();
  const latest = pings[pings.length - 1];
  if (!latest) {
    return null;
  }
  const pingMs = Date.parse(latest.capturedAtIso);
  if (Number.isNaN(pingMs) || Date.now() - pingMs > RECENT_PING_MAX_AGE_MS) {
    return null;
  }
  return {
    lat: latest.lat,
    lng: latest.lng,
    placeLabel: resolvePlaceLabelNearCoords(latest.lat, latest.lng),
    accuracyM: latest.accuracyM,
  };
}

function mapGeolocationError(
  error: GeolocationPositionError,
): EphemeralGpsPlaceFailureReason {
  if (error.code === error.PERMISSION_DENIED) {
    return "denied";
  }
  if (error.code === error.TIMEOUT) {
    return "timeout";
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return "unavailable";
  }
  return "unknown";
}

function readGeolocationPosition(
  enableHighAccuracy: boolean,
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy,
      maximumAge: 90_000,
      timeout: enableHighAccuracy ? 15_000 : 10_000,
    });
  });
}

/** One-shot GPS for place fallback — does not enable background tracking. */
export async function sampleEphemeralGpsPlaceDetailed(): Promise<EphemeralGpsPlaceResult> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { ok: false, reason: "unavailable" };
  }

  await hydrateGpsPingStore();
  const fromPing = readRecentPingSample();
  if (fromPing) {
    return { ok: true, sample: fromPing };
  }

  try {
    const position = await readGeolocationPosition(false);
    const sample = toSample(position);
    void appendGpsPing({
      lat: sample.lat,
      lng: sample.lng,
      accuracyM: sample.accuracyM,
      source: "place_verify_boost",
    });
    return { ok: true, sample };
  } catch (first) {
    void first;
  }

  try {
    const position = await readGeolocationPosition(true);
    const sample = toSample(position);
    void appendGpsPing({
      lat: sample.lat,
      lng: sample.lng,
      accuracyM: sample.accuracyM,
      source: "place_verify_boost",
    });
    return { ok: true, sample };
  } catch (second) {
    if (second instanceof GeolocationPositionError) {
      return { ok: false, reason: mapGeolocationError(second) };
    }
    return { ok: false, reason: "unknown" };
  }
}

export async function sampleEphemeralGpsPlace(): Promise<EphemeralGpsPlaceSample | null> {
  const result = await sampleEphemeralGpsPlaceDetailed();
  return result.ok ? result.sample : null;
}
