import type { TrendDaySegment } from "@/lib/globe/trend-bridge/analysis/trend-capture-types";

const DEFAULT_TZ = "Asia/Seoul";

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  dayOfWeek: number;
};

function readZonedParts(iso: string, timeZone: string): ZonedParts | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) {
    return null;
  }
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = formatter.formatToParts(new Date(ms));
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const weekday = pick("weekday");
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    year: Number(pick("year")),
    month: Number(pick("month")),
    day: Number(pick("day")),
    hour: Number(pick("hour")),
    minute: Number(pick("minute")),
    dayOfWeek: dayMap[weekday] ?? 0,
  };
}

export function resolveTrendDaySegment(dayOfWeek: number): TrendDaySegment {
  return dayOfWeek === 0 || dayOfWeek === 6 ? "weekend" : "weekday";
}

export function formatTrendHourBucketLabel(hourStart: number): string {
  const start = String(hourStart).padStart(2, "0");
  const end = String((hourStart + 1) % 24).padStart(2, "0");
  return `${start}:00 - ${end}:00`;
}

export function formatTrendClockLabel(hour: number, minute = 0): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function normalizeCaptureTimeAnchor(input: {
  timestamp: string;
  timeZone?: string;
}): {
  hourStart: number;
  minute: number;
  dayOfWeek: number;
  daySegment: TrendDaySegment;
  bucketLabel: string;
  clockLabel: string;
} | null {
  const parts = readZonedParts(input.timestamp, input.timeZone ?? DEFAULT_TZ);
  if (!parts) {
    return null;
  }
  const daySegment = resolveTrendDaySegment(parts.dayOfWeek);
  return {
    hourStart: parts.hour,
    minute: parts.minute,
    dayOfWeek: parts.dayOfWeek,
    daySegment,
    bucketLabel: formatTrendHourBucketLabel(parts.hour),
    clockLabel: formatTrendClockLabel(parts.hour, parts.minute),
  };
}
