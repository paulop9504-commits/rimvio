/** Anonymized capture row — EXIF `timestamp` is the density anchor (not ingest time). */
export type TrendCaptureRecord = {
  actorHash: string;
  location: string;
  category: string;
  /** EXIF capture instant (ISO 8601). */
  timestamp: string;
  sentiment?: string | null;
};

export type TrendDaySegment = "weekday" | "weekend";

export type TrendTimeBucket = {
  hourStart: number;
  label: string;
  count: number;
  uniqueActors: number;
};

export type TrendVelocity = "low" | "medium" | "high";

export type TrendCaptureAnalysisResult = {
  hotspot_area: string;
  category: string;
  day_segment: TrendDaySegment;
  day_of_week: number;
  peak_hour: string;
  peak_bucket_start: number;
  trend_velocity: TrendVelocity;
  context_summary: string;
  total_records: number;
  total_contributors: number;
  buckets: TrendTimeBucket[];
};

export type TrendContextDeliveryInput = {
  analysis: TrendCaptureAnalysisResult;
  /** User's own EXIF capture time for comparison. */
  userCaptureTimestamp?: string | null;
  userLocation?: string | null;
};

export type TrendContextMessage = {
  headline: string;
  body: string;
  peak_hour: string;
  user_capture_hour: string | null;
};

export type TrendCaptureAnalysisOptions = {
  timeZone?: string;
  /** Minimum unique actors before emitting a trend (k-anonymity). */
  minContributors?: number;
  /** Max rows per actor per location+category+day segment (bot cap). */
  maxRowsPerActor?: number;
};
