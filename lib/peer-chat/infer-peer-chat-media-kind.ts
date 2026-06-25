import {
  PEER_MESSAGE_IMAGE_PLACEHOLDER,
  PEER_MESSAGE_VIDEO_PLACEHOLDER,
  PEER_CHAT_VIDEO_TYPES,
} from "@/lib/peer-chat/peer-chat-image-constants";

export type PeerChatMediaKind = "photo" | "video";

export function isPeerChatVideoContentType(contentType: string): boolean {
  return PEER_CHAT_VIDEO_TYPES.has(contentType.trim().toLowerCase());
}

export function inferPeerChatMediaKindFromUrl(url: string): PeerChatMediaKind {
  const lower = url.trim().toLowerCase();
  if (/\.(mp4|webm|mov|3gp|3g2)(\?|#|$)/u.test(lower)) {
    return "video";
  }
  return "photo";
}

export function inferPeerChatMediaKind(input: {
  imageUrl?: string | null;
  body?: string | null;
  fileType?: string | null;
}): PeerChatMediaKind | null {
  if (input.fileType && isPeerChatVideoContentType(input.fileType)) {
    return "video";
  }
  const url = input.imageUrl?.trim();
  if (url) {
    return inferPeerChatMediaKindFromUrl(url);
  }
  const body = input.body?.trim();
  if (body === PEER_MESSAGE_VIDEO_PLACEHOLDER) {
    return "video";
  }
  if (body === PEER_MESSAGE_IMAGE_PLACEHOLDER) {
    return "photo";
  }
  return null;
}

export function isPeerChatMediaPlaceholder(body: string): boolean {
  const trimmed = body.trim();
  return (
    trimmed === PEER_MESSAGE_IMAGE_PLACEHOLDER ||
    trimmed === PEER_MESSAGE_VIDEO_PLACEHOLDER
  );
}
