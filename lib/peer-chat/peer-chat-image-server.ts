import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PEER_CHAT_IMAGE_BUCKET,
  PEER_CHAT_IMAGE_MAX_BYTES,
  PEER_CHAT_IMAGE_TYPES,
  PEER_CHAT_VIDEO_MAX_BYTES,
} from "@/lib/peer-chat/peer-chat-image-constants";
import { isPeerChatVideoContentType } from "@/lib/peer-chat/infer-peer-chat-media-kind";
import type { Database } from "@/types/database";

function extensionForContentType(contentType: string): string {
  const normalized = contentType.trim().toLowerCase();
  if (normalized.includes("png")) {
    return "png";
  }
  if (normalized.includes("webp")) {
    return "webp";
  }
  if (normalized.includes("quicktime")) {
    return "mov";
  }
  if (normalized.includes("mp4") || normalized.includes("3gpp")) {
    return "mp4";
  }
  if (normalized.includes("webm")) {
    return "webm";
  }
  return "jpg";
}

export function peerChatImageObjectPath(input: {
  userId: string;
  threadId: string;
  messageId: string;
  contentType: string;
}): string {
  const ext = extensionForContentType(input.contentType);
  return `${input.userId}/${input.threadId}/${input.messageId}.${ext}`;
}

export function publicPeerChatImageUrl(
  supabaseUrl: string,
  objectPath: string,
): string {
  const base = supabaseUrl.replace(/\/$/, "");
  const segments = objectPath.split("/").map((part) => encodeURIComponent(part));
  return `${base}/storage/v1/object/public/${PEER_CHAT_IMAGE_BUCKET}/${segments.join("/")}`;
}

export async function uploadPeerChatImage(
  supabase: SupabaseClient<Database>,
  input: {
    userId: string;
    threadId: string;
    supabaseUrl: string;
    bytes: Buffer;
    contentType: string;
  },
): Promise<{ messageId: string; imageUrl: string }> {
  const contentType = input.contentType?.trim() || "image/jpeg";
  const isVideo = isPeerChatVideoContentType(contentType);
  const isImage = PEER_CHAT_IMAGE_TYPES.has(contentType);
  if (!isImage && !isVideo) {
    throw new Error("JPEG·PNG·WebP 사진 또는 MP4·MOV 동영상만 보낼 수 있어요.");
  }
  const maxBytes = isVideo ? PEER_CHAT_VIDEO_MAX_BYTES : PEER_CHAT_IMAGE_MAX_BYTES;
  if (input.bytes.byteLength > maxBytes) {
    throw new Error(
      isVideo
        ? "80MB 이하 동영상만 보낼 수 있어요."
        : "5MB 이하 사진만 보낼 수 있어요.",
    );
  }
  if (input.bytes.byteLength === 0) {
    throw new Error(isVideo ? "동영상 파일이 비어 있어요." : "사진 파일이 비어 있어요.");
  }

  const messageId = randomUUID();
  const objectPath = peerChatImageObjectPath({
    userId: input.userId,
    threadId: input.threadId,
    messageId,
    contentType,
  });

  const { error } = await supabase.storage
    .from(PEER_CHAT_IMAGE_BUCKET)
    .upload(objectPath, input.bytes, {
      upsert: false,
      contentType,
      cacheControl: "3600",
    });

  if (error) {
    throw error;
  }

  return {
    messageId,
    imageUrl: publicPeerChatImageUrl(input.supabaseUrl, objectPath),
  };
}
