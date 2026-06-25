import { parseIsoMs } from "@/lib/feed/spacetime-fit";

function localDayStamp(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isPassiveLocationFromPriorDay(
  datetimeIso: string | null | undefined,
  now = new Date(),
): boolean {
  const ms = parseIsoMs(datetimeIso ?? null);
  if (ms === null) {
    return false;
  }
  return localDayStamp(new Date(ms)) < localDayStamp(now);
}

export function buildPassiveLocationCareTitle(input: {
  place: string;
  datetimeIso?: string | null;
  now?: Date;
}): string {
  const place = input.place.trim() || "그곳";
  if (isPassiveLocationFromPriorDay(input.datetimeIso, input.now)) {
    return `어제 ${place}`;
  }
  return `${place} · 기록이 쌓였어요`;
}

export function buildPassiveLocationCareBody(input: {
  dwellLabel?: string | null;
}): string {
  if (input.dwellLabel?.trim()) {
    return `${input.dwellLabel} · 수신함에서 볼 수 있어요`;
  }
  return "수신함에서 볼 수 있어요";
}
