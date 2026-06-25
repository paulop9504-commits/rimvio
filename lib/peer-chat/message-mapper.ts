import type { AiMessagePayload, RoomMessageType } from "@/lib/chat-room/types";
import type { PeerMessage } from "@/lib/context/peer-message-types";
import {
  PEER_MESSAGE_IMAGE_PLACEHOLDER,
  PEER_MESSAGE_VIDEO_PLACEHOLDER,
} from "@/lib/peer-chat/peer-chat-image-constants";
import { inferPeerChatMediaKindFromUrl } from "@/lib/peer-chat/infer-peer-chat-media-kind";
import type { PeerMessageRow } from "@/lib/peer-chat/types";

/** DB / legacy rows may omit body for image-only or system messages. */
export function normalizePeerMessageBody(
  body: string | null | undefined,
  imageUrl?: string | null,
): string {
  const trimmed = typeof body === "string" ? body.trim() : "";
  if (trimmed) {
    return trimmed;
  }
  const url = imageUrl?.trim();
  if (!url) {
    return "";
  }
  return inferPeerChatMediaKindFromUrl(url) === "video"
    ? PEER_MESSAGE_VIDEO_PLACEHOLDER
    : PEER_MESSAGE_IMAGE_PLACEHOLDER;
}

function resolveAuthor(
  row: PeerMessageRow,
  currentUserId: string | null | undefined,
): PeerMessage["author"] {
  if (row.message_type === "ai_private" || row.message_type === "ai_shared") {
    return "ai";
  }
  if (currentUserId && row.sender_user_id === currentUserId) {
    return "me";
  }
  return "peer";
}

export function mapPeerMessageRow(
  row: PeerMessageRow,
  currentUserId: string | null | undefined,
): PeerMessage {
  const messageType = (row.message_type ?? "human") as RoomMessageType;
  const aiPayload = (row.ai_payload as AiMessagePayload | null) ?? null;

  const imageUrl = (row as { image_url?: string | null }).image_url ?? null;

  return {
    id: row.id,
    peerThreadId: row.thread_id,
    author: resolveAuthor(row, currentUserId),
    body: normalizePeerMessageBody(row.body, imageUrl),
    sentAt: row.created_at,
    messageType,
    aiPayload,
    imageUrl,
    visibleToMeOnly:
      messageType === "ai_private" &&
      Boolean(currentUserId && row.sender_user_id === currentUserId),
  };
}

export function sortPeerMessages(messages: PeerMessage[]): PeerMessage[] {
  return [...messages].sort(
    (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
  );
}

export function mergePeerMessages(
  current: PeerMessage[],
  incoming: PeerMessage,
): PeerMessage[] {
  if (current.some((m) => m.id === incoming.id)) {
    return current;
  }
  return sortPeerMessages([...current, incoming]);
}

export function mergePeerMessagesBatch(
  current: PeerMessage[],
  incoming: PeerMessage[],
): PeerMessage[] {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const message of incoming) {
    byId.set(message.id, message);
  }
  return sortPeerMessages([...byId.values()]);
}
