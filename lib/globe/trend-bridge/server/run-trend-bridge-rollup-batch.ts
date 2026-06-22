import type { SupabaseClient } from "@supabase/supabase-js";
import {
  aggregateTrendForLocationCategory,
  type TrendCaptureRecord,
} from "@/lib/globe/trend-bridge/analysis";
import { normalizeCaptureTimeAnchor } from "@/lib/globe/trend-bridge/analysis/normalize-capture-time";
import type { TrendBridgeContributionRow } from "@/lib/globe/trend-bridge/server/insert-trend-bridge-contribution";
import {
  boundingBoxForRadiusKm,
  haversineKm,
} from "@/lib/globe/trend-bridge/server/trend-bridge-geo";

export type TrendBridgeRollupRow = {
  id: string;
  bridge_id: string;
  location_dong: string;
  category_label: string;
  day_segment: "weekday" | "weekend";
  peak_hour_label: string;
  peak_bucket_start: number;
  trend_velocity: "low" | "medium" | "high";
  context_summary: string;
  hotspot_lat: number;
  hotspot_lng: number;
  contributor_count: number;
  record_count: number;
  computed_at: string;
};

type GroupKey = string;

function groupKey(
  bridgeId: string,
  locationDong: string,
  daySegment: "weekday" | "weekend",
): GroupKey {
  return `${bridgeId}|${locationDong}|${daySegment}`;
}

function rowsToCaptureRecords(rows: TrendBridgeContributionRow[]): TrendCaptureRecord[] {
  return rows.map((row) => ({
    actorHash: row.actor_hash,
    location: row.location_dong,
    category: row.category_label,
    timestamp: row.capture_at,
    sentiment: row.sentiment,
  }));
}

function hotspotFromPeakBucket(
  rows: TrendBridgeContributionRow[],
  peakBucketStart: number,
): { lat: number; lng: number } | null {
  const peakRows = rows.filter((row) => {
    const anchor = normalizeCaptureTimeAnchor({
      timestamp: row.capture_at,
      timeZone: "Asia/Seoul",
    });
    return anchor?.hourStart === peakBucketStart;
  });
  const geoRows = peakRows.filter(
    (row) =>
      typeof row.lat === "number" &&
      typeof row.lng === "number" &&
      Number.isFinite(row.lat) &&
      Number.isFinite(row.lng),
  );
  const source = geoRows.length > 0 ? geoRows : rows;
  const geoSource = source.filter(
    (row) =>
      typeof row.lat === "number" &&
      typeof row.lng === "number" &&
      Number.isFinite(row.lat) &&
      Number.isFinite(row.lng),
  );
  if (geoSource.length === 0) {
    return null;
  }
  const lat =
    geoSource.reduce((sum, row) => sum + (row.lat as number), 0) / geoSource.length;
  const lng =
    geoSource.reduce((sum, row) => sum + (row.lng as number), 0) / geoSource.length;
  return { lat, lng };
}

export async function runTrendBridgeRollupBatch(
  supabase: SupabaseClient,
  options?: { minContributors?: number; lookbackDays?: number },
): Promise<{ upserted: number; skipped: number }> {
  const minContributors = options?.minContributors ?? 5;
  const lookbackDays = options?.lookbackDays ?? 90;
  const since = new Date(Date.now() - lookbackDays * 86_400_000).toISOString();

  const { data, error } = await supabase
    .from("trend_bridge_contributions")
    .select("*")
    .gte("capture_at", since)
    .order("capture_at", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as TrendBridgeContributionRow[];
  const groups = new Map<GroupKey, TrendBridgeContributionRow[]>();

  for (const row of rows) {
    const key = groupKey(row.bridge_id, row.location_dong, row.day_segment);
    const bucket = groups.get(key) ?? [];
    bucket.push(row);
    groups.set(key, bucket);
  }

  let upserted = 0;
  let skipped = 0;

  for (const [, groupRows] of groups) {
    const sample = groupRows[0]!;
    const records = rowsToCaptureRecords(groupRows);
    const analysis = aggregateTrendForLocationCategory({
      records,
      location: sample.location_dong,
      category: sample.category_label,
      daySegment: sample.day_segment,
      options: { minContributors, timeZone: "Asia/Seoul" },
    });

    if (!analysis) {
      skipped += 1;
      continue;
    }

    const hotspot = hotspotFromPeakBucket(groupRows, analysis.peak_bucket_start);
    if (!hotspot) {
      skipped += 1;
      continue;
    }

    const { error: upsertError } = await supabase.from("trend_bridge_rollups").upsert(
      {
        bridge_id: sample.bridge_id,
        location_dong: sample.location_dong,
        category_label: sample.category_label,
        day_segment: sample.day_segment,
        peak_hour_label: analysis.peak_hour,
        peak_bucket_start: analysis.peak_bucket_start,
        trend_velocity: analysis.trend_velocity,
        context_summary: analysis.context_summary,
        hotspot_lat: hotspot.lat,
        hotspot_lng: hotspot.lng,
        contributor_count: analysis.total_contributors,
        record_count: analysis.total_records,
        computed_at: new Date().toISOString(),
      },
      { onConflict: "bridge_id,location_dong,day_segment" },
    );

    if (upsertError) {
      throw upsertError;
    }
    upserted += 1;
  }

  return { upserted, skipped };
}

export async function listTrendBridgeRollupsNear(
  supabase: SupabaseClient,
  input: {
    bridgeId: string;
    lat: number;
    lng: number;
    daySegment: "weekday" | "weekend";
    radiusKm?: number;
    limit?: number;
  },
): Promise<TrendBridgeRollupRow[]> {
  const radiusKm = input.radiusKm ?? 12;
  const { data, error } = await supabase
    .from("trend_bridge_rollups")
    .select("*")
    .eq("bridge_id", input.bridgeId.trim())
    .eq("day_segment", input.daySegment)
    .order("computed_at", { ascending: false })
    .limit(80);

  if (error) {
    throw error;
  }

  const box = boundingBoxForRadiusKm(input.lat, input.lng, radiusKm);

  return ((data ?? []) as TrendBridgeRollupRow[])
    .filter(
      (row) =>
        row.hotspot_lat >= box.minLat &&
        row.hotspot_lat <= box.maxLat &&
        row.hotspot_lng >= box.minLng &&
        row.hotspot_lng <= box.maxLng &&
        haversineKm(input.lat, input.lng, row.hotspot_lat, row.hotspot_lng) <= radiusKm,
    )
    .slice(0, input.limit ?? 6);
}
