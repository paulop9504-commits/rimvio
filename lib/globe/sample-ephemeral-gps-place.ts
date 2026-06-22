"use client";

import { appendGpsPing } from "@/lib/location-ping/gps-ping-store";
import { resolvePlaceLabelNearCoords } from "@/lib/location-ping/format-place-label";

export type EphemeralGpsPlaceSample = {
  lat: number;
  lng: number;
  placeLabel: string;
  accuracyM: number | null;
};

/** One-shot GPS for place fallback — does not enable background tracking. */
export async function sampleEphemeralGpsPlace(): Promise<EphemeralGpsPlaceSample | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracyM = Number.isFinite(position.coords.accuracy)
          ? position.coords.accuracy
          : null;
        void appendGpsPing({
          lat,
          lng,
          accuracyM,
          source: "place_verify_boost",
        });
        resolve({
          lat,
          lng,
          placeLabel: resolvePlaceLabelNearCoords(lat, lng),
          accuracyM,
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        maximumAge: 45_000,
        timeout: 10_000,
      },
    );
  });
}
