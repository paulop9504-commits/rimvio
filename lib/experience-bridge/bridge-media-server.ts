import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BRIDGE_PHOTO_MAX_BYTES,
  BRIDGE_VIDEO_MAX_BYTES,
  EXPERIENCE_BRIDGE_MEDIA_BUCKET,
  isBridgePhotoContentType,
  isBridgeVideoContentType,
} from "@/lib/experience-bridge/bridge-media-constants";
import type { Database } from "@/types/database";

export function extensionForBridgeMediaContentType(contentType: string): string {
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
  if (normalized.includes("quicktime")) {
    return "mov";
  }
  if (normalized.includes("webm")) {
    return "webm";
  }
  if (normalized.includes("3gpp2")) {
    return "3g2";
  }
  if (normalized.includes("3gpp")) {
    return "3gp";
  }
  if (normalized.startsWith("video/")) {
    return "mp4";
  }
  return "jpg";
}

export function bridgeMediaObjectPath(input: {
  userId: string;
  eventId: string;
  captureId: string;
  contentType: string;
}): string {
  const ext = extensionForBridgeMediaContentType(input.contentType);
  const eventKey = input.eventId.trim();
  const captureKey = input.captureId.trim();
  return `${input.userId}/bridge/${eventKey}/${captureKey}.${ext}`;
}

export function publicBridgeMediaUrl(
  supabaseUrl: string,
  objectPath: string,
): string {
  const base = supabaseUrl.replace(/\/$/, "");
  const segments = objectPath.split("/").map((part) => encodeURIComponent(part));
  return `${base}/storage/v1/object/public/${EXPERIENCE_BRIDGE_MEDIA_BUCKET}/${segments.join("/")}`;
}

/** Upload local capture blob to public experience-bridge storage. */
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
  const contentType = input.contentType?.trim().toLowerCase() || "image/jpeg";
  const isPhoto = isBridgePhotoContentType(contentType);
  const isVideo = isBridgeVideoContentType(contentType);

  if (!isPhoto && !isVideo) {
    throw new Error("JPEG/PNG/WebP 사진 또는 MP4/MOV/WebM 동영상만 공유할 수 있어요.");
  }
  if (input.bytes.byteLength === 0) {
    throw new Error("미디어 파일이 비어 있어요.");
  }
  if (isPhoto && input.bytes.byteLength > BRIDGE_PHOTO_MAX_BYTES) {
    throw new Error("5MB 이하 사진만 공유할 수 있어요.");
  }
  if (isVideo && input.bytes.byteLength > BRIDGE_VIDEO_MAX_BYTES) {
    throw new Error("50MB 이하 동영상만 공유할 수 있어요.");
  }

  const objectPath = bridgeMediaObjectPath({
    userId: input.userId,
    eventId: input.eventId,
    captureId: input.captureId || randomUUID(),
    contentType,
  });

  const { error } = await supabase.storage
    .from(EXPERIENCE_BRIDGE_MEDIA_BUCKET)
    .upload(objectPath, input.bytes, {
      upsert: true,
      contentType,
      cacheControl: "86400",
    });

  if (error) {
    throw error;
  }

  return {
    mediaUrl: publicBridgeMediaUrl(input.supabaseUrl, objectPath),
  };
}
