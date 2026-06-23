import type { PeerMessage } from "@/lib/context/peer-message-types";

/** Local calendar day key for grouping chat date dividers. */
export function peerMessageLocalDayKey(sentAt: string): string | null {
  const date = new Date(sentAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** 카톡식 날짜 pill — e.g. 2026년 6월 24일 수요일 */
export function formatPeerChatDateDividerLabel(
  sentAt: string,
  locale = "ko-KR",
): string {
  const date = new Date(sentAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

/** Show centered date pill when the local day changes from the previous message. */
export function shouldShowPeerDateDivider(
  messages: readonly PeerMessage[],
  index: number,
): boolean {
  const current = messages[index];
  if (!current?.sentAt?.trim()) {
    return false;
  }
  const currentDay = peerMessageLocalDayKey(current.sentAt);
  if (!currentDay) {
    return false;
  }
  const prev = messages[index - 1];
  if (!prev?.sentAt?.trim()) {
    return true;
  }
  const prevDay = peerMessageLocalDayKey(prev.sentAt);
  if (!prevDay) {
    return true;
  }
  return currentDay !== prevDay;
}
