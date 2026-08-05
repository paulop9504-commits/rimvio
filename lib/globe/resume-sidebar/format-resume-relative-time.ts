/** Compact relative labels for Resume sidebar (5m · 2h · 1d). */

export function formatResumeRelativeTime(
  iso: string | null | undefined,
  nowMs: number = Date.now(),
): string {
  const raw = iso?.trim();
  if (!raw) return "";
  const then = new Date(raw).getTime();
  if (!Number.isFinite(then)) return "";
  const delta = Math.max(0, nowMs - then);
  const sec = Math.floor(delta / 1000);
  if (sec < 45) return "지금";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 14) return `${day}d`;
  return new Date(then).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

export function isResumeLiveActivity(
  iso: string | null | undefined,
  nowMs: number = Date.now(),
  windowMs = 5 * 60 * 1000,
): boolean {
  const raw = iso?.trim();
  if (!raw) return false;
  const then = new Date(raw).getTime();
  if (!Number.isFinite(then)) return false;
  return nowMs - then >= 0 && nowMs - then <= windowMs;
}
