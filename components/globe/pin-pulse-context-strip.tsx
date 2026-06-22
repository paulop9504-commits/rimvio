"use client";

import { motion } from "framer-motion";
import { Sparkles, Users } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import type { PinPulsePlaceContext } from "@/lib/globe/trend-bridge/server/fetch-pin-pulse-place-context";
import { RIMVIO_TYPE } from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

export type PinPulseContextStripProps = {
  honorific: string;
  context: PinPulsePlaceContext | null;
  loading?: boolean;
  className?: string;
};

/** Pin detail — crowd warmth + personal Pulse contribution (k-anonymity gated). */
export function PinPulseContextStrip({
  honorific,
  context,
  loading = false,
  className,
}: PinPulseContextStripProps) {
  if (loading) {
    return (
      <div
        className={cn(
          "rounded-2xl bg-muted/40 px-3.5 py-3 shadow-sm",
          className,
        )}
        data-pin-pulse-context="loading"
        aria-busy
      >
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-3 w-full animate-pulse rounded bg-muted/80" />
      </div>
    );
  }

  if (!context) {
    return null;
  }

  const showCrowd =
    typeof context.contributorCount === "number" && context.contributorCount >= 5;
  const showWeekly = context.userWeeklyContributions > 0;
  const showTaste = context.tasteMatch;

  if (!showCrowd && !showWeekly && !showTaste) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={cn(
        "space-y-2 rounded-2xl bg-gradient-to-br from-violet-500/[0.07] to-sky-500/[0.05] px-3.5 py-3 shadow-sm ring-1 ring-black/[0.04]",
        className,
      )}
      data-pin-pulse-context
    >
      {showCrowd ? (
        <div className="flex items-start gap-2.5">
          <Users className="mt-0.5 size-4 shrink-0 text-violet-600/80" aria-hidden />
          <div className="min-w-0">
            <p className={cn(RIMVIO_TYPE.body, "font-semibold text-foreground")}>
              {copy.globe.crowdMemoriesTogether(context.contributorCount!)}
            </p>
            <p className={cn("mt-0.5", RIMVIO_TYPE.caption)}>
              {copy.globe.crowdFootprintsWarm}
            </p>
            {context.peakHour ? (
              <p className={cn("mt-1", RIMVIO_TYPE.caption)}>
                {copy.globe.trendBridgePulseAreaToday(
                  context.locationDong ?? "이곳",
                  context.peakHour,
                )}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {showWeekly ? (
        <div className="flex items-start gap-2.5 border-t border-black/[0.04] pt-2">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-600/80" aria-hidden />
          <div className="min-w-0">
            <p className={cn(RIMVIO_TYPE.body, "font-medium text-foreground")}>
              {copy.globe.memoriesContributionWeek(honorific)}
            </p>
            <p className={cn("mt-0.5", RIMVIO_TYPE.caption)}>
              {copy.globe.memoriesContributionInspire(honorific)}
            </p>
          </div>
        </div>
      ) : null}

      {showTaste ? (
        <p className={cn("border-t border-black/[0.04] pt-2", RIMVIO_TYPE.caption)}>
          {copy.globe.crowdTasteMatch(honorific)}
        </p>
      ) : showCrowd && context.trendVelocity === "high" ? (
        <p className={cn("border-t border-black/[0.04] pt-2", RIMVIO_TYPE.caption)}>
          {copy.globe.crowdTasteToday}
        </p>
      ) : null}
    </motion.div>
  );
}
