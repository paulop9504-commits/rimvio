import type { PeerMessage } from "@/lib/context/peer-message-types";

const CLUSTER_GAP_MS = 60_000;

/** 카톡처럼 1분 안 연속 메시지는 마지막(또는 끊길 때)만 시간 표시 */
export function shouldShowPeerMessageTime(
  messages: PeerMessage[],
  index: number,
): boolean {
  const current = messages[index];
  if (!current) {
    return false;
  }
  const next = messages[index + 1];
  if (!next) {
    return true;
  }
  const gap =
    new Date(next.sentAt).getTime() - new Date(current.sentAt).getTime();
  if (gap > CLUSTER_GAP_MS) {
    return true;
  }
  if (next.author !== current.author) {
    return true;
  }
  return false;
}
