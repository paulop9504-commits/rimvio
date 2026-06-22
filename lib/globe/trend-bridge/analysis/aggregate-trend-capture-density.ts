import type {
  TrendCaptureAnalysisOptions,
  TrendCaptureAnalysisResult,
  TrendCaptureRecord,
  TrendTimeBucket,
  TrendVelocity,
} from "@/lib/globe/trend-bridge/analysis/trend-capture-types";
import { filterTrendCaptureOutliers } from "@/lib/globe/trend-bridge/analysis/filter-trend-capture-outliers";
import {
  formatTrendHourBucketLabel,
  normalizeCaptureTimeAnchor,
} from "@/lib/globe/trend-bridge/analysis/normalize-capture-time";

type GroupKey = string;

function groupKey(
  location: string,
  category: string,
  daySegment: string,
): GroupKey {
  return `${location.trim().toLowerCase()}|${category.trim().toLowerCase()}|${daySegment}`;
}

function buildContextSummary(input: {
  location: string;
  category: string;
  daySegment: "weekday" | "weekend";
  peakHour: string;
  velocity: TrendVelocity;
}): string {
  const dayLabel = input.daySegment === "weekend" ? "주말" : "평일";
  const velocityHint =
    input.velocity === "high"
      ? "흐름이 가장 활기차요"
      : input.velocity === "medium"
        ? "활기가 모이는 편이에요"
        : "고르게 퍼져 있어요";
  return `${dayLabel} ${input.peakHour}경, ${input.location} ${input.category} ${velocityHint}`;
}

function scoreVelocity(peak: number, others: number[]): TrendVelocity {
  if (peak <= 0) {
    return "low";
  }
  const avgOther =
    others.length > 0 ? others.reduce((sum, value) => sum + value, 0) / others.length : 0;
  if (avgOther <= 0) {
    return peak >= 3 ? "high" : "medium";
  }
  const ratio = peak / avgOther;
  if (ratio >= 2.2) {
    return "high";
  }
  if (ratio >= 1.35) {
    return "medium";
  }
  return "low";
}

function dominantDayOfWeek(
  records: TrendCaptureRecord[],
  timeZone?: string,
): number {
  const counts = new Map<number, number>();
  for (const record of records) {
    const anchor = normalizeCaptureTimeAnchor({
      timestamp: record.timestamp,
      timeZone,
    });
    if (!anchor) {
      continue;
    }
    counts.set(anchor.dayOfWeek, (counts.get(anchor.dayOfWeek) ?? 0) + 1);
  }
  let bestDay = 1;
  let bestCount = 0;
  for (const [day, count] of counts) {
    if (count > bestCount) {
      bestDay = day;
      bestCount = count;
    }
  }
  return bestDay;
}

export function aggregateTrendCaptureDensity(
  records: TrendCaptureRecord[],
  options?: TrendCaptureAnalysisOptions,
): TrendCaptureAnalysisResult | null {
  const minContributors = options?.minContributors ?? 5;
  const filtered = filterTrendCaptureOutliers(records, options);

  const bucketMaps = new Map<
    GroupKey,
    Map<number, { count: number; actors: Set<string> }>
  >();
  const groupRecords = new Map<GroupKey, TrendCaptureRecord[]>();
  const groupMeta = new Map<
    GroupKey,
    { location: string; category: string; daySegment: "weekday" | "weekend" }
  >();

  for (const record of filtered) {
    const anchor = normalizeCaptureTimeAnchor({
      timestamp: record.timestamp,
      timeZone: options?.timeZone,
    });
    if (!anchor) {
      continue;
    }
    const key = groupKey(record.location, record.category, anchor.daySegment);
    if (!bucketMaps.has(key)) {
      bucketMaps.set(key, new Map());
      groupRecords.set(key, []);
      groupMeta.set(key, {
        location: record.location,
        category: record.category,
        daySegment: anchor.daySegment,
      });
    }
    groupRecords.get(key)!.push(record);
    const hourMap = bucketMaps.get(key)!;
    if (!hourMap.has(anchor.hourStart)) {
      hourMap.set(anchor.hourStart, { count: 0, actors: new Set() });
    }
    const bucket = hourMap.get(anchor.hourStart)!;
    bucket.count += 1;
    bucket.actors.add(record.actorHash);
  }

  let best: {
    key: GroupKey;
    peakHour: number;
    peakCount: number;
    contributors: number;
    buckets: TrendTimeBucket[];
  } | null = null;

  for (const [key, hourMap] of bucketMaps) {
    const actors = new Set<string>();
    for (const record of groupRecords.get(key) ?? []) {
      actors.add(record.actorHash);
    }
    if (actors.size < minContributors) {
      continue;
    }

    const buckets: TrendTimeBucket[] = [...hourMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([hourStart, stats]) => ({
        hourStart,
        label: formatTrendHourBucketLabel(hourStart),
        count: stats.count,
        uniqueActors: stats.actors.size,
      }));

    const peak = buckets.reduce(
      (winner, row) => (row.count > winner.count ? row : winner),
      buckets[0]!,
    );

    if (!best || peak.count > best.peakCount) {
      best = {
        key,
        peakHour: peak.hourStart,
        peakCount: peak.count,
        contributors: actors.size,
        buckets,
      };
    }
  }

  if (!best) {
    return null;
  }

  const meta = groupMeta.get(best.key)!;
  const peakBucket = best.buckets.find((row) => row.hourStart === best!.peakHour)!;
  const otherCounts = best.buckets
    .filter((row) => row.hourStart !== best!.peakHour)
    .map((row) => row.count);
  const velocity = scoreVelocity(peakBucket.count, otherCounts);
  const dayOfWeek = dominantDayOfWeek(groupRecords.get(best.key) ?? [], options?.timeZone);

  return {
    hotspot_area: meta.location,
    category: meta.category,
    day_segment: meta.daySegment,
    day_of_week: dayOfWeek,
    peak_hour: formatTrendHourBucketLabel(best.peakHour),
    peak_bucket_start: best.peakHour,
    trend_velocity: velocity,
    context_summary: buildContextSummary({
      location: meta.location,
      category: meta.category,
      daySegment: meta.daySegment,
      peakHour: formatTrendHourBucketLabel(best.peakHour),
      velocity,
    }),
    total_records: groupRecords.get(best.key)?.length ?? 0,
    total_contributors: best.contributors,
    buckets: best.buckets,
  };
}

export function aggregateTrendForLocationCategory(input: {
  records: TrendCaptureRecord[];
  location: string;
  category: string;
  daySegment?: "weekday" | "weekend";
  options?: TrendCaptureAnalysisOptions;
}): TrendCaptureAnalysisResult | null {
  const location = input.location.trim();
  const category = input.category.trim();
  const scoped = input.records.filter(
    (row) =>
      row.location.trim() === location && row.category.trim() === category,
  );

  const daySegment = input.daySegment ?? "weekend";
  const segmentRows = scoped.filter((row) => {
    const anchor = normalizeCaptureTimeAnchor({
      timestamp: row.timestamp,
      timeZone: input.options?.timeZone,
    });
    return anchor?.daySegment === daySegment;
  });

  return aggregateTrendCaptureDensity(segmentRows, input.options);
}
