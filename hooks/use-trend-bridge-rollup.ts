"use client";

import { useEffect, useState } from "react";
import { resolveTrendDaySegment } from "@/lib/globe/trend-bridge/analysis/normalize-capture-time";
import type { TrendBridgeZone } from "@/lib/globe/trend-bridge/trend-bridge-types";
import { projectTrendBridgeRollupZones } from "@/lib/globe/trend-bridge/project-trend-bridge-rollup-zones";
import { projectTrendBridgeStubZones } from "@/lib/globe/trend-bridge/project-trend-bridge-stub-zones";

export type TrendBridgeRollupSnapshot = {
  zones: TrendBridgeZone[];
  contextSummary: string | null;
  peakHour: string | null;
  source: "rollup" | "stub";
};

export function useTrendBridgeRollup(input: {
  active: boolean;
  bridgeId: string | null;
  anchorLat: number | null;
  anchorLng: number | null;
}): TrendBridgeRollupSnapshot {
  const [snapshot, setSnapshot] = useState<TrendBridgeRollupSnapshot>({
    zones: [],
    contextSummary: null,
    peakHour: null,
    source: "stub",
  });

  useEffect(() => {
    if (!input.active || !input.bridgeId?.trim()) {
      setSnapshot({
        zones: [],
        contextSummary: null,
        peakHour: null,
        source: "stub",
      });
      return;
    }

    const bridgeId = input.bridgeId.trim();
    const lat = input.anchorLat;
    const lng = input.anchorLng;

    if (lat === null || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      setSnapshot({
        zones: projectTrendBridgeStubZones({ bridgeId, anchorLat: lat, anchorLng: lng }),
        contextSummary: null,
        peakHour: null,
        source: "stub",
      });
      return;
    }

    const daySegment = resolveTrendDaySegment(new Date().getDay());
    let cancelled = false;

    void (async () => {
      try {
        const params = new URLSearchParams({
          bridgeId,
          lat: String(lat),
          lng: String(lng),
          daySegment,
        });
        const response = await fetch(`/api/globe/trend-bridge/rollup?${params.toString()}`);
        if (!response.ok) {
          throw new Error("rollup_fetch_failed");
        }
        const body = (await response.json()) as {
          ok?: boolean;
          rollups?: Array<{
            id: string;
            hotspot_lat: number;
            hotspot_lng: number;
            location_dong: string;
            trend_velocity: string;
            peak_hour_label: string;
            context_summary: string;
          }>;
        };
        if (cancelled) {
          return;
        }
        if (body.ok && body.rollups && body.rollups.length > 0) {
          const zones = projectTrendBridgeRollupZones({
            bridgeId,
            rollups: body.rollups.map((row) => ({
              id: row.id,
              bridge_id: bridgeId,
              location_dong: row.location_dong,
              category_label: "",
              day_segment: daySegment,
              peak_hour_label: row.peak_hour_label,
              peak_bucket_start: 0,
              trend_velocity: row.trend_velocity as "low" | "medium" | "high",
              context_summary: row.context_summary,
              hotspot_lat: row.hotspot_lat,
              hotspot_lng: row.hotspot_lng,
              contributor_count: 5,
              record_count: 0,
              computed_at: new Date().toISOString(),
            })),
          });
          const primary = body.rollups[0]!;
          setSnapshot({
            zones,
            contextSummary: primary.context_summary,
            peakHour: primary.peak_hour_label,
            source: "rollup",
          });
          return;
        }
      } catch {
        // fall through to stub
      }

      if (!cancelled) {
        setSnapshot({
          zones: projectTrendBridgeStubZones({
            bridgeId,
            anchorLat: lat,
            anchorLng: lng,
          }),
          contextSummary: null,
          peakHour: null,
          source: "stub",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [input.active, input.anchorLat, input.anchorLng, input.bridgeId]);

  return snapshot;
}
