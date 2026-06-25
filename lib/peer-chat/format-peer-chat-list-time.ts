const DAY_MS = 24 * 60 * 60 * 1000;

function startOfLocalDay(atMs: number): number {
  const d = new Date(atMs);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Kakao-style chat list timestamp — clock today, 어제, then date. */
export function formatPeerChatListTime(iso: string, now = Date.now()): string {
  const at = new Date(iso).getTime();
  if (!Number.isFinite(at)) {
    return "";
  }

  const todayStart = startOfLocalDay(now);
  if (at >= todayStart) {
    return new Date(at).toLocaleTimeString("ko-KR", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  const yesterdayStart = todayStart - DAY_MS;
  if (at >= yesterdayStart) {
    return "어제";
  }

  const nowDate = new Date(now);
  const msgDate = new Date(at);
  if (msgDate.getFullYear() === nowDate.getFullYear()) {
    return `${msgDate.getMonth() + 1}월 ${msgDate.getDate()}일`;
  }

  return `${msgDate.getFullYear()}. ${msgDate.getMonth() + 1}. ${msgDate.getDate()}.`;
}
