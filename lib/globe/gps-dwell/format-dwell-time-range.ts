import { parseIsoMs } from "@/lib/feed/spacetime-fit";

function formatLocalDateTime(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${month}월 ${day}일 ${hours}:${minutes}`;
}

function formatLocalTime(date: Date): string {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/** Korean local range — `6월 23일 14:20 – 15:03`. */
export function formatDwellTimeRange(
  startIso: string,
  endIso: string,
): string {
  const startMs = parseIsoMs(startIso);
  const endMs = parseIsoMs(endIso);
  if (startMs === null || endMs === null) {
    return "";
  }
  const start = new Date(startMs);
  const end = new Date(endMs);
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  if (sameDay) {
    return `${formatLocalDateTime(start)} – ${formatLocalTime(end)}`;
  }
  return `${formatLocalDateTime(start)} – ${formatLocalDateTime(end)}`;
}

export function resolveDwellFragmentEndIso(input: {
  startIso: string;
  endedAtIso?: string | null;
  dwellMinutes?: number | null;
}): string {
  const ended = input.endedAtIso?.trim();
  if (ended) {
    return ended;
  }
  const startMs = parseIsoMs(input.startIso);
  const minutes = input.dwellMinutes;
  if (startMs !== null && typeof minutes === "number" && minutes > 0) {
    return new Date(startMs + minutes * 60_000).toISOString();
  }
  return input.startIso;
}
