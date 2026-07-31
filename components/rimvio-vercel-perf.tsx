"use client";

/**
 * Vercel Pro perf telemetry — Speed Insights + Web Analytics.
 * Enable products in the Vercel dashboard if not already on.
 */

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { RimvioVercelWarm } from "@/components/rimvio-vercel-warm";

export function RimvioVercelPerf() {
  return (
    <>
      <Analytics />
      <SpeedInsights />
      <RimvioVercelWarm />
    </>
  );
}
