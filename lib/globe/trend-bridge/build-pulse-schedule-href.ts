import { buildGoogleCalendarTemplateHref } from "@/lib/actions/search-urls";
import { formatTrendHourBucketLabel } from "@/lib/globe/trend-bridge/analysis/normalize-capture-time";

export function buildPulseScheduleHref(input: {
  placeLabel: string;
  peakHour: string;
  quietHour?: string | null;
  mode: "align" | "avoid";
}): string {
  const place = input.placeLabel.trim();
  const title =
    input.mode === "avoid"
      ? `${place} — 한산한 시간`
      : `${place} 다시 가기`;
  const details =
    input.mode === "avoid"
      ? `Pulse 피크 ${input.peakHour} · 한산한 ${input.quietHour ?? "시간"}에 방문`
      : `지난 Memories와 맞는 시간대 ${input.peakHour}`;
  return buildGoogleCalendarTemplateHref({
    title,
    details,
    location: place,
  });
}

export function inferQuietHourLabel(peakHourLabel: string): string | null {
  const match = peakHourLabel.match(/^(\d{2}):00/u);
  if (!match) {
    return null;
  }
  const peakStart = Number(match[1]);
  if (!Number.isFinite(peakStart)) {
    return null;
  }
  const quietStart = (peakStart + 5) % 24;
  return formatTrendHourBucketLabel(quietStart);
}
