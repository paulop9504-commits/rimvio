import {
  PEER_CHAT_IMAGE_BUCKET,
  PEER_MESSAGE_IMAGE_PLACEHOLDER,
  PEER_MESSAGE_VIDEO_PLACEHOLDER,
} from "@/lib/peer-chat/peer-chat-image-constants";
import { isPeerChatMediaPlaceholder } from "@/lib/peer-chat/infer-peer-chat-media-kind";

/** Days without any message before photo/video attachments are removed. */
export const PEER_THREAD_MEDIA_INACTIVE_DAYS = 30;

export function peerThreadMediaInactiveCutoffMs(
  now = Date.now(),
  days = PEER_THREAD_MEDIA_INACTIVE_DAYS,
): number {
  return now - days * 24 * 60 * 60 * 1000;
}

export function isPeerThreadInactive(
  lastActivityIso: string | null | undefined,
  cutoffMs: number,
  now = Date.now(),
): boolean {
  if (!lastActivityIso?.trim()) {
    return false;
  }
  const at = new Date(lastActivityIso).getTime();
  if (Number.isNaN(at)) {
    return false;
  }
  return at < cutoffMs;
}

/** Public storage URL → object path inside `peer-chat` bucket. */
export function peerChatStoragePathFromPublicUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }
  const marker = `/storage/v1/object/public/${PEER_CHAT_IMAGE_BUCKET}/`;
  const idx = trimmed.indexOf(marker);
  if (idx < 0) {
    return null;
  }
  return decodeURIComponent(trimmed.slice(idx + marker.length));
}

export function isMediaOnlyPeerMessageBody(body: string | null | undefined): boolean {
  const trimmed = body?.trim() ?? "";
  return (
    isPeerChatMediaPlaceholder(trimmed) ||
    trimmed === PEER_MESSAGE_IMAGE_PLACEHOLDER ||
    trimmed === PEER_MESSAGE_VIDEO_PLACEHOLDER
  );
}
