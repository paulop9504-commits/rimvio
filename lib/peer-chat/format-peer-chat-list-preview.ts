import {
  PEER_MESSAGE_IMAGE_PLACEHOLDER,
  PEER_MESSAGE_VIDEO_PLACEHOLDER,
} from "@/lib/peer-chat/peer-chat-image-constants";

export type PeerChatListPreviewLabels = {
  photo: string;
  video: string;
  startChat: string;
  newMessages: (n: number) => string;
};

/** Line 2 preview — media placeholders, last text, or empty-state copy. */
export function formatPeerChatListPreview(
  lastMessage: string | null | undefined,
  unreadCount: number,
  labels: PeerChatListPreviewLabels,
): string {
  const trimmed = lastMessage?.trim();
  if (trimmed === PEER_MESSAGE_IMAGE_PLACEHOLDER) {
    return labels.photo;
  }
  if (trimmed === PEER_MESSAGE_VIDEO_PLACEHOLDER) {
    return labels.video;
  }
  if (trimmed) {
    return trimmed;
  }
  if (unreadCount > 0) {
    return labels.newMessages(unreadCount);
  }
  return labels.startChat;
}
