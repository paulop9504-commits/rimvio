"use client";

import { requestGpsBurst } from "@/lib/location-ping/gps-burst-sample";
import { OPPORTUNITY_GPS_BURST_MS } from "@/lib/globe/opportunity-field/observation-constants";

let burstTimer: ReturnType<typeof setInterval> | null = null;
let activeCount = 0;

async function runBurst(): Promise<void> {
  await requestGpsBurst({
    reason: "live_refresh",
    tier: "active",
    force: true,
  });
}

/** Dashboard sheet open — 15–30s GPS burst for observation mode. */
export function startOpportunityObservationMode(): void {
  activeCount += 1;
  if (burstTimer != null) {
    return;
  }
  void runBurst();
  burstTimer = setInterval(() => {
    void runBurst();
  }, OPPORTUNITY_GPS_BURST_MS);
}

export function stopOpportunityObservationMode(): void {
  activeCount = Math.max(0, activeCount - 1);
  if (activeCount > 0 || burstTimer == null) {
    return;
  }
  clearInterval(burstTimer);
  burstTimer = null;
}

export function resetOpportunityObservationModeForTests(): void {
  activeCount = 0;
  if (burstTimer != null) {
    clearInterval(burstTimer);
    burstTimer = null;
  }
}
