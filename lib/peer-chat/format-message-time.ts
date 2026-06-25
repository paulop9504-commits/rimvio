/** Chat bubble time — local HH:mm. */
export function formatPeerMessageTime(sentAt: string): string {
  const date = new Date(sentAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Long-press sheet — 인스타 DM 맥락 메뉴 헤더 */
export function formatPeerMessageContextTime(sentAt: string): string {
  const date = new Date(sentAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
