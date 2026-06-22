"use client";

import { appendGpsPing } from "@/lib/location-ping/gps-ping-store";

const BATCH_WINDOW_MS = 45_000;

let batchBoostPromise: Promise<void> | null = null;
let batchBoostAt = 0;

/** Sample GPS once per upload batch — avoids 8s × N stalls on mobile. */
async function sampleGpsForUpload(): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return;
  }

  await new Promise<void>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void appendGpsPing({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyM: position.coords.accuracy,
          source: "upload_boost",
        }).finally(resolve);
      },
      () => resolve(),
      {
        enableHighAccuracy: true,
        maximumAge: 90_000,
        timeout: 5_000,
      },
    );
  });
}

export async function boostGpsPingForUploadBatch(): Promise<void> {
  const now = Date.now();
  if (batchBoostPromise && now - batchBoostAt < BATCH_WINDOW_MS) {
    return batchBoostPromise;
  }
  batchBoostAt = now;
  batchBoostPromise = sampleGpsForUpload().finally(() => {
    batchBoostPromise = null;
  });
  return batchBoostPromise;
}

export function resetUploadGpsBoostBatch(): void {
  batchBoostPromise = null;
  batchBoostAt = 0;
}
