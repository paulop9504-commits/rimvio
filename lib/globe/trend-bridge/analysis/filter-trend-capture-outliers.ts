import type {
  TrendCaptureRecord,
  TrendDaySegment,
} from "@/lib/globe/trend-bridge/analysis/trend-capture-types";
import { normalizeCaptureTimeAnchor } from "@/lib/globe/trend-bridge/analysis/normalize-capture-time";

type NormalizedRow = TrendCaptureRecord & {
  daySegment: TrendDaySegment;
  bucketKey: string;
};

function bucketKey(
  row: TrendCaptureRecord,
  daySegment: TrendDaySegment,
): string {
  return `${row.location.trim().toLowerCase()}|${row.category.trim().toLowerCase()}|${daySegment}`;
}

function normalizeRows(
  records: TrendCaptureRecord[],
  timeZone?: string,
): NormalizedRow[] {
  const rows: NormalizedRow[] = [];
  for (const record of records) {
    const anchor = normalizeCaptureTimeAnchor({
      timestamp: record.timestamp,
      timeZone,
    });
    if (!anchor) {
      continue;
    }
    rows.push({
      ...record,
      location: record.location.trim(),
      category: record.category.trim(),
      actorHash: record.actorHash.trim(),
      daySegment: anchor.daySegment,
      bucketKey: bucketKey(record, anchor.daySegment),
    });
  }
  return rows;
}

/** Cap repeat submissions per actor — repeated bursts treated as bot noise. */
export function filterTrendCaptureOutliers(
  records: TrendCaptureRecord[],
  options?: {
    timeZone?: string;
    maxRowsPerActor?: number;
  },
): TrendCaptureRecord[] {
  const maxRowsPerActor = options?.maxRowsPerActor ?? 3;
  const rows = normalizeRows(records, options?.timeZone);
  const counts = new Map<string, number>();
  const kept: TrendCaptureRecord[] = [];

  for (const row of rows) {
    const actorKey = `${row.bucketKey}|${row.actorHash}`;
    const seen = counts.get(actorKey) ?? 0;
    if (seen >= maxRowsPerActor) {
      continue;
    }
    counts.set(actorKey, seen + 1);
    kept.push({
      actorHash: row.actorHash,
      location: row.location,
      category: row.category,
      timestamp: row.timestamp,
      sentiment: row.sentiment,
    });
  }

  return kept;
}
