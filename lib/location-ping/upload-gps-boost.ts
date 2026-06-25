"use client";

import { requestGpsBurst } from "@/lib/location-ping/gps-burst-sample";

const BATCH_WINDOW_MS = 45_000;

let batchBoostPromise: Promise<void> | null = null;
let batchBoostAt = 0;

/** Active GPS burst once per upload batch — no continuous tracking. */
export async function boostGpsPingForUploadBatch(): Promise<void> {
  const now = Date.now();
  if (batchBoostPromise && now - batchBoostAt < BATCH_WINDOW_MS) {
    return batchBoostPromise;
  }
  batchBoostAt = now;
  batchBoostPromise = requestGpsBurst({
    reason: "upload",
    tier: "active",
    force: true,
  }).then(() => undefined).finally(() => {
    batchBoostPromise = null;
  });
  return batchBoostPromise;
}

export function resetUploadGpsBoostBatch(): void {
  batchBoostPromise = null;
  batchBoostAt = 0;
}
