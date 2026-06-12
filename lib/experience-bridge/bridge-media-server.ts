import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PEER_CHAT_IMAGE_BUCKET,
  PEER_CHAT_IMAGE_MAX_BYTES,
  PEER_CHAT_IMAGE_TYPES,
} from "@/lib/peer-chat/peer-chat-image-constants";
import { publicPeerChatImageUrl } from "@/lib/peer-chat/peer-chat-image-server";
import type { Database } from "@/types/database";

function extensionForContentType(contentType: string): string {
  const normalized = contentType.trim().toLowerCase();
  if (normalized.includes("png")) {
    return "png";
  }
  if (normalized.includes("webp")) {
    return "webp";
  }
  if (normalized.includes("heic")) {
    return "heic";
  }
  if (normalized.includes("heif")) {
    return "heif";
  }
  return "jpg";
}

export function bridgeMediaObjectPath(input: {
  userId: string;
  eventId: string;
  captureId: string;
  contentType: string;
}): string {
  const ext = extensionForContentType(input.contentType);
  const eventKey = encodeURIComponent(input.eventId.trim());
  const captureKey = encodeURIComponent(input.captureId.trim());
  return `${input.userId}/bridge/${eventKey}/${captureKey}.${ext}`;
}

/** Host share — upload local capture blob to public peer-chat storage. */
export async function uploadBridgeCaptureMedia(
  supabase: SupabaseClient<Database>,
  input: {
    userId: string;
    eventId: string;
    captureId: string;
    supabaseUrl: string;
    bytes: Buffer;
    contentType: string;
  },
): Promise<{ mediaUrl: string }> {
  const contentType = input.contentType?.trim() || "image/jpeg";
  if (!PEER_CHAT_IMAGE_TYPES.has(contentType)) {
    throw new Error("JPEG, PNG, WebP 사진만 공유할 수 있어요.");
  }
  if (input.bytes.byteLength > PEER_CHAT_IMAGE_MAX_BYTES) {
    throw new Error("5MB 이하 사진만 공유할 수 있어요.");
  }
  if (input.bytes.byteLength === 0) {
    throw new Error("사진 파일이 비어 있어요.");
  }

  const objectPath = bridgeMediaObjectPath({
    userId: input.userId,
    eventId: input.eventId,
    captureId: input.captureId || randomUUID(),
    contentType,
  });

  const { error } = await supabase.storage
    .from(PEER_CHAT_IMAGE_BUCKET)
    .upload(objectPath, input.bytes, {
      upsert: true,
      contentType,
      cacheControl: "86400",
    });

  if (error) {
    throw error;
  }

  return {
    mediaUrl: publicPeerChatImageUrl(input.supabaseUrl, objectPath),
  };
}
