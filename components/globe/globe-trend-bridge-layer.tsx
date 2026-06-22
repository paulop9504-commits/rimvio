"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getTrendBridgeFeature } from "@/lib/globe/trend-bridge/trend-bridge-feature-registry";
import { rollupZoneToScreenOffset } from "@/lib/globe/trend-bridge/project-trend-bridge-rollup-zones";
import type { TrendBridgeZone } from "@/lib/globe/trend-bridge/trend-bridge-types";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

const MIST_COLORS = [
  "bg-violet-400/22",
  "bg-sky-400/18",
  "bg-amber-300/14",
  "bg-emerald-300/14",
] as const;

export type GlobeTrendBridgeLayerProps = {
  visible: boolean;
  bridgeId: string | null;
  anchorLat?: number | null;
  anchorLng?: number | null;
  zones: TrendBridgeZone[];
  contextSummary?: string | null;
  peakHour?: string | null;
  dataSource?: "rollup" | "stub";
  className?: string;
};

/** Map mist layer — rollup geo zones with stub fallback. */
export function GlobeTrendBridgeLayer({
  visible,
  bridgeId,
  anchorLat = null,
  anchorLng = null,
  zones,
  contextSummary = null,
  peakHour = null,
  dataSource = "stub",
  className,
}: GlobeTrendBridgeLayerProps) {
  const feature = bridgeId ? getTrendBridgeFeature(bridgeId) : null;

  const positionedZones = useMemo(() => {
    if (!visible || zones.length === 0) {
      return [];
    }
    const anchorReady =
      anchorLat !== null &&
      anchorLng !== null &&
      Number.isFinite(anchorLat) &&
      Number.isFinite(anchorLng);

    return zones.map((zone, index) => {
      if (anchorReady && dataSource === "rollup") {
        const offset = rollupZoneToScreenOffset({
          anchorLat: anchorLat as number,
          anchorLng: anchorLng as number,
          zoneLat: zone.lat,
          zoneLng: zone.lng,
        });
        return { zone, index, ...offset, sizeRem: 10 + index * 2 };
      }

      const fallbackLeft = [50, 58, 42][index] ?? 50;
      const fallbackTop = [38, 48, 52][index] ?? 44;
      return {
        zone,
        index,
        leftPercent: fallbackLeft,
        topPercent: fallbackTop,
        sizeRem: 18 - index * 4,
      };
    });
  }, [anchorLat, anchorLng, dataSource, visible, zones]);

  const badgeLine = useMemo(() => {
    if (!feature) {
      return null;
    }
    if (contextSummary?.trim()) {
      return contextSummary.trim();
    }
    if (peakHour?.trim() && zones[0]?.label?.trim()) {
      return copy.globe.trendBridgePulseAreaToday(zones[0].label, peakHour);
    }
    if (peakHour?.trim() && feature) {
      return copy.globe.trendBridgeLayerPeakHint(feature.displayName, peakHour);
    }
    return copy.globe.trendBridgeLayerBadge(feature.displayName);
  }, [contextSummary, feature, peakHour, zones]);

  return (
    <AnimatePresence>
      {visible && feature && positionedZones.length > 0 ? (
        <motion.div
          key={`trend-bridge-${feature.bridgeId}-${dataSource}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          className={cn(
            "pointer-events-none absolute inset-0 z-[12] overflow-hidden",
            className,
          )}
          data-globe-trend-bridge-layer
          data-globe-trend-bridge-id={feature.bridgeId}
          data-globe-trend-bridge-source={dataSource}
          aria-hidden
        >
          {positionedZones.map(({ zone, index, leftPercent, topPercent, sizeRem }) => (
            <div
              key={zone.id}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl",
                MIST_COLORS[index % MIST_COLORS.length],
              )}
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                width: `min(${sizeRem}vw, ${sizeRem}rem)`,
                height: `min(${sizeRem}vw, ${sizeRem}rem)`,
                opacity: zone.intensity,
              }}
              data-globe-trend-bridge-zone={zone.id}
            />
          ))}
          {badgeLine ? (
            <div className="absolute inset-x-6 top-[max(3.5rem,env(safe-area-inset-top))] flex justify-center">
              <span className="max-w-[min(100vw-3rem,22rem)] rounded-full bg-black/40 px-3 py-1 text-center text-[11px] font-medium leading-snug text-white/90 ring-1 ring-white/15 backdrop-blur-sm">
                {badgeLine}
              </span>
            </div>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
