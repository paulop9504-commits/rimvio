"use client";

/**
 * Vercel Pro perf telemetry — Speed Insights + Web Analytics.
 * Enable products in the Vercel dashboard if not already on.
 */

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export function RimvioVercelPerf() {
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
